# Plant Monitor V5

Plant Monitor V5 is now split into:

- a Vite React frontend
- a Node API server for auth, plant storage, and Gemini chat
- a Neon Postgres database for users, plants, snapshots, and reminders

## What changed

- Sign up and sign in are backed by Neon.
- Plant data is stored in the database instead of browser-only localStorage.
- Snapshot images are stored in managed local file storage with size limits, not directly inside Neon.
- Gemini image analysis now runs on the server so the API key stays out of the browser.
- Reminder/calendar data is stored in Neon.
- A new AI chat page can:
  - answer from the user's saved plants and recent photos
  - chat casually
  - use Gemini web search for current information
- The UI was restyled with a darker glassmorphism dashboard, hover fades, and smoother transitions.
- Mutating actions now prompt the user to keep or discard the change before saving.

## Environment setup

1. Copy `.env.example` to `.env.local`.
2. Fill in:

```env
VITE_API_BASE_URL=http://localhost:8000/api
CLIENT_ORIGIN=http://localhost:3000
PORT=8000
PDDD_API_URL=http://localhost:8001
MAX_IMAGE_BYTES=8388608
MAX_USER_STORAGE_BYTES=157286400
DATABASE_URL=your-neon-connection-string
JWT_SECRET=your-long-random-secret
GEMINI_API_KEY=your-gemini-api-key
PDDD_MODEL_PATH=optional-path-to-your-model.onnx
PDDD_LABELS_PATH=optional-path-to-your-labels.json
PDDD_HEALTHY_LABELS=healthy,normal,no_disease
```

## Neon setup

1. Create a new Neon project.
2. Copy the connection string into `DATABASE_URL`.
3. Open the SQL editor in Neon.
4. Run the schema in [server/schema.sql](/c:/Users/12345/Downloads/plant-health-monitor/Plant%20Monitor%20V5/server/schema.sql).

## Install and run

1. Install dependencies:

```powershell
npm install
```

2. Start the API server:

```powershell
npm run dev:server
```

3. In a second terminal, start the Python PDDD service:

```powershell
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001
```

4. In a third terminal, start the frontend:

```powershell
npm run dev
```

5. Open `http://localhost:3000`.

## Verification

- Type check: `node_modules\.bin\tsc.cmd --noEmit`
- Production build: `npm run build`

## Notes

- The Python `backend/` service now supports loading a real ONNX PDDD model when `PDDD_MODEL_PATH` and `PDDD_LABELS_PATH` are configured.
- Uploaded images are saved under the local `uploads/` folder and served through the Node API.
