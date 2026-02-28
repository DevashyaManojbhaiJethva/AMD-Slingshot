# AgriSoil AI

Production-oriented soil analysis platform using:
- Frontend: React + Vite
- Backend: FastAPI (Python)
- ML: PyTorch inference example
- DB: MongoDB Atlas
- Auth: Firebase Authentication (Google + Email)
- Weather: Open-Meteo integration

## Project Structure

```text
.
├─ src/                         # React frontend
│  ├─ api/client.ts             # API client + Firebase bearer token helper
│  ├─ components/SoilUpload.tsx # Upload + geolocation + weather + /analyze call
│  ├─ pages/
│  │  ├─ Dashboard.tsx          # Server-backed history loading
│  │  └─ SoilResult.tsx         # Weather + previous analysis history rendering
│  └─ store/useStore.ts         # Shared app state models
├─ backend/
│  ├─ app/
│  │  ├─ main.py                # FastAPI app, CORS, static uploads
│  │  ├─ config.py              # Environment settings
│  │  ├─ db.py                  # MongoDB connection
│  │  ├─ deps.py                # Firebase token verification dependency
│  │  ├─ routers/
│  │  │  ├─ analyze.py          # POST /analyze
│  │  │  └─ history.py          # GET /history/{userId}
│  │  └─ services/
│  │     ├─ firebase_service.py # Firebase Admin verification
│  │     ├─ model_service.py    # PyTorch inference pipeline
│  │     ├─ weather_service.py  # Weather API integration
│  │     └─ storage_service.py  # Upload persistence
│  ├─ requirements.txt
│  └─ .env.example
└─ .env.example                 # Frontend env vars
```

## Functional Coverage

- Firebase Google login in frontend
- Firebase ID token sent to backend (`Authorization: Bearer <token>`)
- Backend verifies Firebase token before protected endpoints
- User input supports up to 4 images + soil depth + browser geolocation
- `/analyze` accepts multipart form data:
  - `latitude`
  - `longitude`
  - `soilDepthCm`
  - `images` (1-4 files)
- Weather fetched from API using lat/lon (temperature + humidity)
- PyTorch inference combines image features + weather + depth
- MongoDB `analysis` collection stores:
  - `userId`, image URLs, depth, weather, model outputs, crops, fertilizer plan, 7-day plan, `createdAt`
- `/history/{userId}` returns newest-first analysis records for verified user
- Frontend result page shows soil parameters, weather, crop recommendations, fertilizer advice, work plan, and previous history

## Frontend Setup

1. Install dependencies:
   - `npm install`
2. Create `.env.local` from `.env.example` and set:
   - `VITE_API_BASE_URL`
   - Firebase web config values (`VITE_FIREBASE_*`)
3. Run:
   - `npm run dev`

## Backend Setup

1. Go to backend:
   - `cd backend`
2. Create virtual environment and activate it.
3. Install dependencies:
   - `pip install -r requirements.txt`
4. Copy `.env.example` to `.env` and fill values:
   - `MONGO_URI`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_SERVICE_ACCOUNT_PATH`
   - `CORS_ORIGINS`
5. Run API:
   - `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

## Security & Reliability Notes

- MongoDB uses URI-based secure connection (Atlas TLS)
- CORS is explicit and environment-driven
- Token verification required for `/analyze` and `/history/{userId}`
- Error states are surfaced in frontend upload/history flows
- Loading states included for location, weather, upload, and history fetch
