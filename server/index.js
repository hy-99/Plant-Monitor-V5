import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import { requireAuth, signAuthToken } from './auth.js';
import { initializeDatabase, sql } from './db.js';
import { analyzePlantImage, answerChat, dataUrlToInlineData } from './gemini.js';
import { decodeImageDataUrl, enforceUserStorageQuota, ensureUploadRoot, getUploadRoot, persistImageForUser, removeStoredImage } from './storage.js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const app = express();
const port = Number(process.env.PORT || 8000);
const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...configuredOrigins,
]);
const recurrenceValues = new Set(['none', 'daily', 'weekly', 'monthly']);
const usernamePattern = /^[a-z0-9_]{3,20}$/;

await ensureUploadRoot();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '15mb' }));
app.use('/uploads', express.static(getUploadRoot()));

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  username: user.username,
  createdAt: user.created_at,
});

const buildAbsoluteImageUrl = (req, imagePath) => `${req.protocol}://${req.get('host')}/uploads/${imagePath}`;

const mapSnapshot = (row, req, options = {}) => {
  const snapshot = {
    id: row.snapshot_id,
    imageUrl: row.image_path ? buildAbsoluteImageUrl(req, row.image_path) : row.image_data_url,
    summary: row.summary,
    analysis: row.analysis,
    timestamp: row.timestamp,
  };

  if (options.includeChatImageData) {
    snapshot.imageDataUrl = row.image_data_url;
    snapshot.imagePath = row.image_path;
    snapshot.imageMimeType = row.image_mime_type;
  }

  return snapshot;
};

const mapPlantRows = (rows, req, options = {}) => {
  const plants = new Map();

  for (const row of rows) {
    if (!plants.has(row.plant_id)) {
      plants.set(row.plant_id, {
        id: row.plant_id,
        name: row.plant_name,
        snapshots: [],
      });
    }

    if (row.snapshot_id) {
      plants.get(row.plant_id).snapshots.push(mapSnapshot(row, req, options));
    }
  }

  return [...plants.values()];
};

const mapReminder = (row) => ({
  id: row.id,
  plantId: row.plant_id,
  title: row.title,
  notes: row.notes,
  dueAt: row.due_at,
  recurrence: row.recurrence,
  completedAt: row.completed_at,
  lastCompletedAt: row.last_completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapChatMessage = (row) => ({
  id: row.id,
  role: row.role,
  content: row.content,
  createdAt: row.created_at,
  mode: row.mode,
  sources: row.sources || [],
  plantId: row.plant_id,
});

const getUserPlants = async (userId, req, options = {}) => {
  const rows = await sql`
    select
      p.id as plant_id,
      p.name as plant_name,
      s.id as snapshot_id,
      s.image_data_url,
      s.image_path,
      s.image_mime_type,
      s.summary,
      s.analysis,
      s.timestamp
    from plants p
    left join snapshots s on s.plant_id = p.id
    where p.user_id = ${userId}
    order by p.updated_at desc, s.timestamp asc
  `;

  return mapPlantRows(rows, req, options);
};

const getUserReminders = async (userId) => {
  const rows = await sql`
    select id, plant_id, title, notes, due_at, recurrence, completed_at, last_completed_at, created_at, updated_at
    from reminders
    where user_id = ${userId}
    order by due_at asc
  `;

  return rows.map(mapReminder);
};

const getStorageUsage = async (userId) => {
  const [row] = await sql`
    select coalesce(sum(s.image_size_bytes), 0)::bigint as bytes_used
    from snapshots s
    join plants p on p.id = s.plant_id
    where p.user_id = ${userId}
  `;

  const bytesUsed = Number(row?.bytes_used || 0);
  const bytesLimit = Number(process.env.MAX_USER_STORAGE_BYTES || 150 * 1024 * 1024);

  return {
    bytesUsed,
    bytesLimit,
    bytesRemaining: Math.max(bytesLimit - bytesUsed, 0),
  };
};

const getChatHistory = async (userId, plantId) => {
  const rows = plantId
    ? await sql`
        select id, plant_id, role, mode, content, sources, created_at
        from chat_messages
        where user_id = ${userId} and plant_id = ${plantId}
        order by created_at asc
      `
    : await sql`
        select id, plant_id, role, mode, content, sources, created_at
        from chat_messages
        where user_id = ${userId} and plant_id is null
        order by created_at asc
      `;

  return rows.map(mapChatMessage);
};

const persistChatMessage = async ({ userId, plantId, role, mode, content, sources = [] }) => {
  const [row] = await sql`
    insert into chat_messages (user_id, plant_id, role, mode, content, sources)
    values (${userId}, ${plantId}, ${role}, ${mode}, ${content}, ${JSON.stringify(sources)}::jsonb)
    returning id, plant_id, role, mode, content, sources, created_at
  `;

  return mapChatMessage(row);
};

const ensureReminderPayload = ({ title, dueAt, recurrence }) => {
  if (!title || !dueAt) {
    throw new Error('Reminder title and due date are required.');
  }

  if (!recurrenceValues.has(recurrence || 'none')) {
    throw new Error('Invalid recurrence value.');
  }
};

const advanceDueDate = (dueAt, recurrence) => {
  const next = new Date(dueAt);
  if (recurrence === 'daily') next.setDate(next.getDate() + 1);
  if (recurrence === 'weekly') next.setDate(next.getDate() + 7);
  if (recurrence === 'monthly') next.setMonth(next.getMonth() + 1);
  return next.toISOString();
};

const normalizeUsername = (username) => String(username || '').trim().toLowerCase();

const validateUsername = (username) => {
  if (!usernamePattern.test(username)) {
    throw new Error('Username must be 3-20 characters and use only lowercase letters, numbers, or underscores.');
  }
};

const validatePassword = (password) => {
  const value = String(password || '');
  const rules = [
    value.length >= 8,
    /[A-Z]/.test(value),
    /[a-z]/.test(value),
    /\d/.test(value),
  ];

  if (rules.some((passed) => !passed)) {
    throw new Error('Password must be at least 8 characters and include uppercase, lowercase, and a number.');
  }
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, username, password } = req.body || {};

  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Name, username, and password are required.' });
  }

  const normalizedUsername = normalizeUsername(username);

  try {
    validateUsername(normalizedUsername);
    validatePassword(password);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid account details.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const [user] = await sql`
      insert into users (name, username, password_hash)
      values (${String(name).trim()}, ${normalizedUsername}, ${passwordHash})
      returning id, name, username, created_at
    `;

    return res.status(201).json({
      token: signAuthToken(user),
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (String(error?.message || '').toLowerCase().includes('unique')) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }

    console.error(error);
    return res.status(500).json({ error: 'Unable to create account.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const normalizedUsername = normalizeUsername(username);

  try {
    validateUsername(normalizedUsername);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid username.' });
  }

  try {
    const [user] = await sql`
      select id, name, username, password_hash, created_at
      from users
      where username = ${normalizedUsername}
      limit 1
    `;

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    return res.json({
      token: signAuthToken(user),
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to log in right now.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const [user] = await sql`
    select id, name, username, created_at
    from users
    where id = ${req.auth.sub}
    limit 1
  `;

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json({ user: sanitizeUser(user) });
});

app.patch('/api/auth/me', requireAuth, async (req, res) => {
  const name = String(req.body?.name || '').trim();

  if (!name) {
    return res.status(400).json({ error: 'Display name is required.' });
  }

  const [user] = await sql`
    update users
    set name = ${name}
    where id = ${req.auth.sub}
    returning id, name, username, created_at
  `;

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json({ user: sanitizeUser(user) });
});

app.post('/api/guest/analyze', async (req, res) => {
  const { imageDataUrl } = req.body || {};

  if (!imageDataUrl) {
    return res.status(400).json({ error: 'An image is required.' });
  }

  try {
    const imageData = dataUrlToInlineData(imageDataUrl);
    const result = await analyzePlantImage(imageData);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to analyze image.' });
  }
});

app.get('/api/plants', requireAuth, async (req, res) => {
  const plants = await getUserPlants(req.auth.sub, req);
  return res.json({ plants });
});

app.get('/api/storage', requireAuth, async (req, res) => {
  return res.json({ usage: await getStorageUsage(req.auth.sub) });
});

app.post('/api/plants', requireAuth, async (req, res) => {
  const { name, imageDataUrl } = req.body || {};

  if (!name || !imageDataUrl) {
    return res.status(400).json({ error: 'Plant name and image are required.' });
  }

  try {
    const imageData = dataUrlToInlineData(imageDataUrl);
    const { buffer } = decodeImageDataUrl(imageDataUrl);
    await enforceUserStorageQuota(sql, req.auth.sub, buffer.length);

    const stored = await persistImageForUser(req.auth.sub, imageDataUrl);
    const { analysis, summary } = await analyzePlantImage(imageData);

    const [plant] = await sql`
      insert into plants (user_id, name)
      values (${req.auth.sub}, ${String(name).trim()})
      returning id, name
    `;

    const [snapshot] = await sql`
      insert into snapshots (plant_id, image_path, image_size_bytes, image_mime_type, image_sha256, summary, analysis)
      values (${plant.id}, ${stored.relativePath}, ${stored.sizeBytes}, ${stored.mimeType}, ${stored.sha256}, ${summary}, ${JSON.stringify(analysis)}::jsonb)
      returning id as snapshot_id, image_path, image_data_url, summary, analysis, timestamp
    `;

    await sql`
      update plants
      set updated_at = now()
      where id = ${plant.id}
    `;

    return res.status(201).json({
      plant: {
        id: plant.id,
        name: plant.name,
        snapshots: [mapSnapshot(snapshot, req)],
      },
      usage: await getStorageUsage(req.auth.sub),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to create plant.' });
  }
});

app.patch('/api/plants/:plantId', requireAuth, async (req, res) => {
  const { plantId } = req.params;
  const { name } = req.body || {};

  if (!name) {
    return res.status(400).json({ error: 'Plant name is required.' });
  }

  const [plant] = await sql`
    update plants
    set name = ${String(name).trim()}, updated_at = now()
    where id = ${plantId} and user_id = ${req.auth.sub}
    returning id, name
  `;

  if (!plant) {
    return res.status(404).json({ error: 'Plant not found.' });
  }

  return res.json({ plant });
});

app.post('/api/plants/:plantId/snapshots', requireAuth, async (req, res) => {
  const { plantId } = req.params;
  const { imageDataUrl } = req.body || {};

  if (!imageDataUrl) {
    return res.status(400).json({ error: 'Snapshot image is required.' });
  }

  const [plant] = await sql`
    select id
    from plants
    where id = ${plantId} and user_id = ${req.auth.sub}
    limit 1
  `;

  if (!plant) {
    return res.status(404).json({ error: 'Plant not found.' });
  }

  try {
    const imageData = dataUrlToInlineData(imageDataUrl);
    const { buffer } = decodeImageDataUrl(imageDataUrl);
    await enforceUserStorageQuota(sql, req.auth.sub, buffer.length);

    const stored = await persistImageForUser(req.auth.sub, imageDataUrl);
    const { analysis, summary } = await analyzePlantImage(imageData);

    const [snapshot] = await sql`
      insert into snapshots (plant_id, image_path, image_size_bytes, image_mime_type, image_sha256, summary, analysis)
      values (${plantId}, ${stored.relativePath}, ${stored.sizeBytes}, ${stored.mimeType}, ${stored.sha256}, ${summary}, ${JSON.stringify(analysis)}::jsonb)
      returning id as snapshot_id, image_path, image_data_url, summary, analysis, timestamp
    `;

    await sql`
      update plants
      set updated_at = now()
      where id = ${plantId}
    `;

    return res.status(201).json({
      snapshot: mapSnapshot(snapshot, req),
      usage: await getStorageUsage(req.auth.sub),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to create snapshot.' });
  }
});

app.patch('/api/plants/:plantId/snapshots/:snapshotId/feedback', requireAuth, async (req, res) => {
  const { plantId, snapshotId } = req.params;
  const { rating, comment } = req.body || {};

  const [snapshot] = await sql`
    select s.id, s.analysis
    from snapshots s
    join plants p on p.id = s.plant_id
    where s.id = ${snapshotId} and s.plant_id = ${plantId} and p.user_id = ${req.auth.sub}
    limit 1
  `;

  if (!snapshot) {
    return res.status(404).json({ error: 'Snapshot not found.' });
  }

  const nextAnalysis = {
    ...snapshot.analysis,
    feedback: {
      rating,
      comment: comment || undefined,
    },
  };

  const [updated] = await sql`
    update snapshots
    set analysis = ${JSON.stringify(nextAnalysis)}::jsonb
    where id = ${snapshotId}
    returning id, analysis
  `;

  return res.json({ snapshot: updated });
});

app.delete('/api/plants/:plantId/snapshots/:snapshotId', requireAuth, async (req, res) => {
  const { plantId, snapshotId } = req.params;

  const deleted = await sql`
    delete from snapshots s
    using plants p
    where s.id = ${snapshotId}
      and s.plant_id = ${plantId}
      and p.id = s.plant_id
      and p.user_id = ${req.auth.sub}
    returning s.id, s.image_path
  `;

  if (!deleted.length) {
    return res.status(404).json({ error: 'Snapshot not found.' });
  }

  await removeStoredImage(deleted[0].image_path);

  const remaining = await sql`
    select count(*)::int as count
    from snapshots
    where plant_id = ${plantId}
  `;

  if (remaining[0]?.count === 0) {
    await sql`
      delete from plants
      where id = ${plantId} and user_id = ${req.auth.sub}
    `;
  } else {
    await sql`
      update plants
      set updated_at = now()
      where id = ${plantId}
    `;
  }

  return res.status(204).send();
});

app.get('/api/reminders', requireAuth, async (req, res) => {
  return res.json({ reminders: await getUserReminders(req.auth.sub) });
});

app.get('/api/chat/history', requireAuth, async (req, res) => {
  const plantId = typeof req.query.plantId === 'string' && req.query.plantId.trim() ? req.query.plantId.trim() : null;

  if (plantId) {
    const [plant] = await sql`
      select id from plants where id = ${plantId} and user_id = ${req.auth.sub} limit 1
    `;
    if (!plant) {
      return res.status(404).json({ error: 'Plant not found for chat history.' });
    }
  }

  return res.json({ messages: await getChatHistory(req.auth.sub, plantId) });
});

app.post('/api/reminders', requireAuth, async (req, res) => {
  const { title, notes = null, dueAt, recurrence = 'none', plantId = null } = req.body || {};

  try {
    ensureReminderPayload({ title, dueAt, recurrence });

    if (plantId) {
      const [plant] = await sql`
        select id from plants where id = ${plantId} and user_id = ${req.auth.sub} limit 1
      `;
      if (!plant) return res.status(404).json({ error: 'Plant not found for reminder.' });
    }

    const [row] = await sql`
      insert into reminders (user_id, plant_id, title, notes, due_at, recurrence)
      values (${req.auth.sub}, ${plantId}, ${String(title).trim()}, ${notes}, ${dueAt}, ${recurrence})
      returning *
    `;
    return res.status(201).json({ reminder: mapReminder(row) });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to create reminder.' });
  }
});

app.patch('/api/reminders/:reminderId', requireAuth, async (req, res) => {
  const { reminderId } = req.params;
  const { title, notes = null, dueAt, recurrence = 'none', plantId = null } = req.body || {};

  try {
    ensureReminderPayload({ title, dueAt, recurrence });

    if (plantId) {
      const [plant] = await sql`
        select id from plants where id = ${plantId} and user_id = ${req.auth.sub} limit 1
      `;
      if (!plant) return res.status(404).json({ error: 'Plant not found for reminder.' });
    }

    const [row] = await sql`
      update reminders
      set plant_id = ${plantId},
          title = ${String(title).trim()},
          notes = ${notes},
          due_at = ${dueAt},
          recurrence = ${recurrence},
          updated_at = now()
      where id = ${reminderId} and user_id = ${req.auth.sub}
      returning *
    `;

    if (!row) return res.status(404).json({ error: 'Reminder not found.' });
    return res.json({ reminder: mapReminder(row) });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to update reminder.' });
  }
});

app.patch('/api/reminders/:reminderId/complete', requireAuth, async (req, res) => {
  const { reminderId } = req.params;
  const [row] = await sql`
    select * from reminders
    where id = ${reminderId} and user_id = ${req.auth.sub}
    limit 1
  `;

  if (!row) return res.status(404).json({ error: 'Reminder not found.' });

  const nextDueAt = row.recurrence !== 'none' ? advanceDueDate(row.due_at, row.recurrence) : row.due_at;
  const [updated] = await sql`
    update reminders
    set completed_at = ${row.recurrence === 'none' ? new Date().toISOString() : null},
        last_completed_at = ${new Date().toISOString()},
        due_at = ${row.recurrence === 'none' ? row.due_at : nextDueAt},
        updated_at = now()
    where id = ${reminderId}
    returning *
  `;

  return res.json({ reminder: mapReminder(updated) });
});

app.delete('/api/reminders/:reminderId', requireAuth, async (req, res) => {
  const deleted = await sql`
    delete from reminders
    where id = ${req.params.reminderId} and user_id = ${req.auth.sub}
    returning id
  `;

  if (!deleted.length) return res.status(404).json({ error: 'Reminder not found.' });
  return res.status(204).send();
});

app.post('/api/chat', requireAuth, async (req, res) => {
  const { question, plantId = null, mode = 'plant', history = [] } = req.body || {};

  if (!question) {
    return res.status(400).json({ error: 'A question is required.' });
  }

  try {
    if (plantId) {
      const [plant] = await sql`
        select id from plants where id = ${plantId} and user_id = ${req.auth.sub} limit 1
      `;
      if (!plant) {
        return res.status(404).json({ error: 'Plant not found for chat.' });
      }
    }

    const plants = await getUserPlants(req.auth.sub, req, { includeChatImageData: true });
    const result = await answerChat({
      mode,
      question,
      history,
      plants,
      selectedPlantId: plantId,
    });

    const userMessage = await persistChatMessage({
      userId: req.auth.sub,
      plantId,
      role: 'user',
      mode,
      content: question,
    });
    const assistantMessage = await persistChatMessage({
      userId: req.auth.sub,
      plantId,
      role: 'assistant',
      mode,
      content: result.answer,
      sources: result.sources,
    });

    return res.json({
      ...result,
      messages: [userMessage, assistantMessage],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to answer the chat request.' });
  }
});

app.listen(port, () => {
  console.log(`Plant Guard API listening on http://localhost:${port}`);
});

initializeDatabase()
  .then(() => {
    console.log('Database initialization complete.');
  })
  .catch((error) => {
    console.error('Database initialization failed.', error);
  });
