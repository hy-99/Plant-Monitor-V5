# Plant Guard V5

Plant Guard V5 is an AI-powered plant health workspace built for:

- diagnosing plant photos
- tracking health over time
- turning care advice into reminders
- teaching users why symptoms matter
- keeping the experience enjoyable with a customizable ghost companion

## Product Summary

The app is designed as three connected layers:

- `Plant health platform`
  - image analysis
  - health summaries
  - snapshot history
  - reminders
  - AI chat
- `Education layer`
  - learning panels after analysis
  - change-over-time explanations
  - symptom-aware follow-up guidance
- `Companion layer`
  - contextual ghost reactions
  - rotating plant facts
  - lightweight personalization

## Architecture

Plant Guard V5 is split into:

- a Vite React frontend
- a Node API server for auth, storage, reminders, and Gemini chat
- a Neon Postgres database for users, plants, snapshots, chat history, and reminders
- a Python PDDD service for health/disease inference support

## Core Features

- Account signup and login
- Plant creation with image analysis
- Snapshot history for each plant
- Comparison and trend reading over time
- Reminder calendar with smart suggestions
- AI chat with plant context, casual mode, and web mode
- Achievement and profile progression
- Educational analysis summaries
- Customizable ghost companion

## Hackathon / Demo Flow

The strongest demo flow is:

1. Sign in or create an account.
2. Add a plant photo and get an AI result.
3. Show the learning panel and care plan.
4. Open the detail page and explain comparison over time.
5. Show reminders or AI chat as the next-step workflow.

## Environment Setup

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

## Database Setup

1. Create a Neon project.
2. Copy the connection string into `DATABASE_URL`.
3. Start the Node server.

The server now initializes the schema automatically from [server/schema.sql](/c:/Users/12345/Downloads/plant-health-monitor/Plant%20Monitor%20V5/server/schema.sql), so a fresh database does not require a separate manual SQL step during normal startup.

## Install And Run

1. Install dependencies:

```powershell
npm install
```

2. Start the Node API server:

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

- Type check: `npm run typecheck`
- Production build: `npm run build`

## Notes

- Uploaded images are saved under the local `uploads/` folder and served through the Node API.
- The Python `backend/` service supports loading a real ONNX PDDD model when `PDDD_MODEL_PATH` and `PDDD_LABELS_PATH` are configured.
- The frontend prefers the Vite `/api` proxy automatically in local development when appropriate.
