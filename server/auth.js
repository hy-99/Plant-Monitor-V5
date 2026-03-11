import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET is required to start the API server.');
}

export const signAuthToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      username: user.username,
      name: user.name,
    },
    jwtSecret,
    { expiresIn: '7d' }
  );

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token.' });
  }

  try {
    req.auth = jwt.verify(token, jwtSecret);
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};
