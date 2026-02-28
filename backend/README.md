# AgriSoil FastAPI Backend

## Stack
- FastAPI
- PyTorch (example inference pipeline)
- MongoDB Atlas (Motor)
- Firebase token verification
- Open-Meteo weather API

## Setup
1. Create a Python virtual environment.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   Note: `torch` and `torchvision` are required for the Smart Agri image classifier integration.
3. Copy `.env.example` to `.env` and fill required values.
4. Place your Firebase Admin service account file and set `FIREBASE_SERVICE_ACCOUNT_PATH`.
5. Run server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## Endpoints
- `POST /analyze` (multipart/form-data, Firebase bearer token)
- `GET /history/{userId}` (Firebase bearer token)
- `GET /health`

## Request fields for `/analyze`
- `latitude` (float)
- `longitude` (float)
- `soilDepthCm` (float)
- `images` (1-4 files)

Optional (frontend can send too):
- `temperatureC`
- `moisturePct`

## Notes
- Uploaded files are stored in `backend/uploads/` and served from `/uploads/*`.
- Mongo collection name: `analysis`.
- `torch` is optional in this setup; if unavailable, backend uses a deterministic NumPy fallback inference path.
- Smart Agri classifier weights are loaded from `backend/model_assets/smart_agri/soil_model.pth` when available.
