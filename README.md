<div align="center">

# AgriSoil AI 🌱

### *Intelligent Soil Analysis. Smarter Agriculture.*

> Upload a soil image → Get **AI-powered soil type, moisture, pH, granule analysis**, crop recommendations, fertilizer plans & 7-day work schedules — all in seconds. No lab. No sensors. Just a photo.

<br/>

[![React](https://img.shields.io/badge/React%20%2B%20Vite-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![MobileNetV2](https://img.shields.io/badge/MobileNetV2-ImageNet-FF6F00?style=for-the-badge&logo=google&logoColor=white)](https://pytorch.org/vision/stable/models/mobilenetv2.html)
[![MongoDB](https://img.shields.io/badge/MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Firebase](https://img.shields.io/badge/Firebase%20Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![AMD](https://img.shields.io/badge/AMD%20ROCm-ED1C24?style=for-the-badge&logo=amd&logoColor=white)](https://rocm.docs.amd.com/)
[![Python](https://img.shields.io/badge/Python%203.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)

<br/>

![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square)
![Team](https://img.shields.io/badge/Team-ByteBenders-purple?style=flat-square)
![Track](https://img.shields.io/badge/Track-AI%20For%20Sustainability%20%7C%20GreenTech-2ea44f?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-orange?style=flat-square)

<br/>

</div>

<br/>

## The Idea

**AgriSoil AI** is a production-grade, full-stack soil intelligence platform that transforms a simple smartphone photo into a **comprehensive multi-parameter soil health report** — with zero lab equipment required.

Traditional soil testing is expensive, slow, and inaccessible to most farmers. AgriSoil AI solves this by combining **computer vision**, **deep learning**, and **real-time weather data** to deliver instant, affordable, and actionable insights.

> **USP:** AgriSoil AI transforms a simple soil image into a comprehensive multi-parameter soil health report using a hybrid AI system — no lab tests, no hardware sensors required.

<br/>

---

## ML Pipeline

This is not a simple classifier. AgriSoil AI is a **multi-parameter soil intelligence system** combining deep learning, texture modelling, and granule-level structural analysis.

### Feature Extraction

Every soil image goes through a **4-layer feature pipeline** before inference:

| Layer | Method | What It Captures |
|:------|:-------|:----------------|
| **Texture Analysis** | GLCM (Grey-Level Co-occurrence Matrix) | Energy, contrast, correlation — soil roughness & structural uniformity |
| **Granule Analysis** | Particle detection algorithms | Granule count, density, average size, size variation (uniformity) |
| **Color Distribution** | HSV + RGB histograms | Soil moisture indicators, organic content signals |
| **Deep CNN Embeddings** | MobileNetV2 (ImageNet pretrained) | 1280-dimensional deep feature vectors |

### Inference Models

```
Soil Image
    │
    ├── OpenCV Preprocessing
    │       └── Resize → Normalize → Augment
    │
    ├── GPUCVExtractor (AMD ROCm / CUDA)
    │       ├── GLCM Texture Features
    │       ├── Granule Size & Density
    │       └── HSV / RGB Color Histograms
    │
    ├── MobileNetV2 Backbone (1280-dim embeddings)
    │
    └── Prediction Heads
            ├── Soil Type Classifier    → Clay / Loam / Sand / Silt + confidence score
            ├── Moisture Regressor      → Ridge Regression → moisture %
            ├── pH Regressor            → Ridge Regression → pH value
            └── GSM Metric Estimator    → Granule structure metric
```

### Saved Model Artifacts

```
models/
├── soil_model.pth          # MobileNetV2 backbone + classifier head
├── moisture_model.pkl      # Ridge Regression — moisture %
├── ph_model.pkl            # Ridge Regression — pH value
├── gsm_model.pkl           # GSM granule structure metric
└── granule_model.pkl       # Granule count & density estimator
```

<br/>

---

## Features

### Soil Analysis Capabilities

| Feature | Description |
|:--------|:------------|
| **Soil Type Classification** | Identifies Clay, Loam, Sand, or Silt with a confidence score |
| **Moisture Level Estimation** | Estimates moisture % from image features — guides irrigation decisions |
| **pH Value Estimation** | Predicts approximate soil pH — supports fertilizer and nutrient planning |
| **Granule Structural Analysis** | Counts particles, calculates density, average size, and size variation |
| **Texture Analysis (GLCM)** | Extracts Energy and Contrast metrics — quantifies soil roughness |
| **Detailed Prediction Report** | Per-image output: Soil type · Confidence · Moisture % · pH · GSM · Granule density |

### Platform Capabilities

```
✅  Firebase Google + Email login with server-side token verification
✅  Upload 1–4 soil images with optional depth input
✅  Automatic browser geolocation for real-time weather fetch
✅  PyTorch model fuses image embeddings + weather + soil depth
✅  Crop recommendations, fertilizer plans & 7-day work schedules
✅  Per-user analysis history (newest-first, MongoDB-backed)
✅  PDF / CSV report generation
✅  GPU-accelerated inference via AMD ROCm / CUDA
✅  All endpoints fully authenticated — zero unauthenticated access
✅  CORS locked to configured origins only
```

<br/>

---

## System Architecture

```mermaid
flowchart TD
    A("📱 Farmer / User") -->|"Upload Soil Image + Location"| B("⚛️ React Frontend")
    B -->|"Get ID Token"| C("🔐 Firebase Auth")
    C -->|"Bearer Token"| B
    B -->|"POST /analyze — multipart + token"| D("⚡ FastAPI Backend")
    D -->|"Verify Token"| E("🛡️ Firebase Admin SDK")
    E -->|"✅ Verified"| D
    D -->|"lat / lon"| F("🌦️ Open-Meteo API")
    F -->|"Temp + Humidity"| D
    D -->|"Soil Images"| G("OpenCV Preprocessor")
    G -->|"Processed Frames"| H("⚡ GPUCVExtractor\nGLCM · Granule · Color")
    H -->|"Feature Vectors"| I("MobileNetV2\n1280-dim Embeddings")
    I -->|"Combined Features + Weather + Depth"| J("Prediction Heads\nSoil · pH · Moisture · GSM")
    J -->|"Results + Recommendations"| D
    D -->|"Store Record"| K("MongoDB Atlas")
    D -->|"Full Analysis Result"| B
    B -->|"📋 Render Report"| A

    style A fill:#4CAF50,color:#fff,stroke:#388E3C
    style B fill:#61DAFB,color:#000,stroke:#0097A7
    style D fill:#009688,color:#fff,stroke:#00796B
    style H fill:#FF6F00,color:#fff,stroke:#E65100
    style I fill:#EE4C2C,color:#fff,stroke:#BF360C
    style J fill:#7B1FA2,color:#fff,stroke:#4A148C
    style K fill:#47A248,color:#fff,stroke:#2E7D32
```

<br/>

---

## 🔄 Data Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend as ⚛️ Frontend
    participant Firebase as 🔐 Firebase
    participant API as ⚡ FastAPI
    participant Weather as 🌦️ Open-Meteo
    participant ML as ML Pipeline
    participant DB as 🍃 MongoDB

    User->>Frontend: Upload 1–4 Soil Images + Depth
    Frontend->>Firebase: Request Auth Token
    Firebase-->>Frontend: ID Token (JWT)
    Frontend->>API: POST /analyze (images + lat/lon + depth + token)
    API->>Firebase: Verify Bearer Token
    Firebase-->>API: ✅ Token Valid
    API->>Weather: Fetch Weather (lat/lon)
    Weather-->>API: Temperature + Humidity
    API->>ML: OpenCV → GLCM → MobileNetV2 → Predict
    ML-->>API: Soil Type · pH · Moisture · Granules · Recommendations
    API->>DB: Persist Analysis Record
    DB-->>API: Saved ✓
    API-->>Frontend: Full JSON Result
    Frontend-->>User: 📋 Render Analysis Report + PDF/CSV Export
```

<br/>

---

## Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| **Frontend** | React 18 + Vite | Lightning-fast UI, upload, geolocation, history |
| **Backend** | FastAPI (Python) | Async REST API with automatic OpenAPI docs |
| **Deep Learning** | PyTorch + MobileNetV2 | 1280-dim CNN embeddings from soil images |
| **Computer Vision** | OpenCV + GLCM | Image preprocessing + texture feature extraction |
| **ML Models** | Scikit-learn Ridge Regression | pH, moisture, and GSM prediction heads |
| **Database** | MongoDB Atlas | Flexible document storage for analysis records |
| **Auth** | Firebase (Google + Email) | Secure identity with JWT token verification |
| **Weather** | Open-Meteo API | Real-time temperature + humidity by coordinates |
| **Hardware** | AMD Ryzen + Radeon (ROCm) | GPU-accelerated inference and training |

<br/>

---

## 📁 Project Structure

```
AMD-Slingshot/
│
├── 📂 src/                              # React Frontend
│   ├── 📄 api/client.ts                 # Axios client + Firebase bearer token injector
│   ├── 📂 components/
│   │   └── 📄 SoilUpload.tsx            # Image upload + geolocation + /analyze trigger
│   ├── 📂 pages/
│   │   ├── 📄 Dashboard.tsx             # Auth-gated history dashboard
│   │   └── 📄 SoilResult.tsx            # Analysis result + weather + history renderer
│   └── 📄 store/useStore.ts             # Zustand global state models
│
├── 📂 backend/
│   ├── 📂 app/
│   │   ├── 📄 main.py                   # FastAPI app entry, CORS, static mounts
│   │   ├── 📄 config.py                 # Pydantic settings from .env
│   │   ├── 📄 db.py                     # MongoDB Atlas async connection
│   │   ├── 📄 deps.py                   # Firebase token verification dependency
│   │   ├── 📂 routers/
│   │   │   ├── 📄 analyze.py            # POST /analyze — core inference route
│   │   │   └── 📄 history.py            # GET /history/{userId}
│   │   └── 📂 services/
│   │       ├── 📄 firebase_service.py   # Firebase Admin ID token verifier
│   │       ├── 📄 model_service.py      # PyTorch + GLCM + granule inference pipeline
│   │       ├── 📄 weather_service.py    # Open-Meteo weather fetcher
│   │       └── 📄 storage_service.py    # Uploaded image persistence
│   ├── 📄 requirements.txt
│   └── 📄 .env.example
│
├── 📂 models/                           # Saved model artifacts
│   ├── 📄 soil_model.pth                # MobileNetV2 backbone + classifier
│   ├── 📄 moisture_model.pkl            # Ridge Regression — moisture %
│   ├── 📄 ph_model.pkl                  # Ridge Regression — pH value
│   ├── 📄 gsm_model.pkl                 # GSM granule structure metric
│   └── 📄 granule_model.pkl             # Granule count & density estimator
│
└── 📄 .env.example                      # Frontend environment variable template
```

<br/>

---

## Quick Start

### Prerequisites

- [Node.js 18+](https://nodejs.org/) + npm
- [Python 3.10+](https://python.org/)
- [MongoDB Atlas](https://www.mongodb.com/atlas) account
- [Firebase](https://firebase.google.com/) project with Auth enabled
- AMD ROCm or CUDA-compatible GPU *(optional — CPU fallback supported)*

---

### 1️) Clone the Repository

```bash
git clone https://github.com/DevashyaManojbhaiJethva/AMD-Slingshot.git
cd AMD-Slingshot
```

---

### 2️) Frontend Setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000

VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

```bash
npm run dev
# → http://localhost:5173
```

---

### 3️) Backend Setup

```bash
cd backend
python -m venv venv
```

| Platform | Activate Command |
|:---------|:----------------|
| Windows | `venv\Scripts\activate` |
| macOS / Linux | `source venv/bin/activate` |

```bash
pip install -r requirements.txt
cp .env.example .env
```

```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/agrisoil
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
CORS_ORIGINS=http://localhost:5173
```

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# → API:    http://localhost:8000
# → Docs:   http://localhost:8000/docs
```

<br/>

---

## API Reference

### `POST /analyze` — Run Soil Analysis

> **Requires Firebase Bearer Token**

Accepts `multipart/form-data`:

| Field | Type | Required | Description |
|:------|:-----|:--------:|:------------|
| `latitude` | `float` | ✅ | GPS latitude from browser geolocation |
| `longitude` | `float` | ✅ | GPS longitude from browser geolocation |
| `soilDepthCm` | `int` | ✅ | Sample depth in centimetres |
| `images` | `file[]` | ✅ | 1 to 4 soil image files |

**Example Response:**

```json
{
  "soilType": "Loam",
  "soilConfidence": 0.91,
  "moisture": 38.4,
  "ph": 6.8,
  "gsmMetric": 0.74,
  "granules": { "count": 312, "avgSize": 2.4, "density": 0.68, "uniformity": 0.81 },
  "texture": { "energy": 0.52, "contrast": 0.19 },
  "weather": { "temperature": 28.5, "humidity": 64 },
  "cropRecommendations": ["Wheat", "Barley", "Mustard"],
  "fertilizerPlan": "Apply 40 kg/acre urea at sowing stage...",
  "sevenDayPlan": { "day1": "Soil preparation...", "day3": "Irrigation..." },
  "analysisId": "64f3b2c1a9e3f10012ab45cd"
}
```

---

### `GET /history/{userId}` — Fetch User History

> **Requires Firebase Bearer Token**

Returns all past analysis records for the authenticated user, sorted newest-first.

<br/>

---

## MongoDB Schema

```json
{
  "_id": "ObjectId",
  "userId": "firebase_uid_string",
  "imageUrls": ["https://storage.../soil1.jpg"],
  "soilDepthCm": 30,
  "weather": { "temperature": 28.5, "humidity": 64 },
  "modelOutputs": {
    "soilType": "Loam",
    "soilConfidence": 0.91,
    "moisture": 38.4,
    "ph": 6.8,
    "gsmMetric": 0.74,
    "granules": { "count": 312, "avgSize": 2.4, "density": 0.68 },
    "texture": { "energy": 0.52, "contrast": 0.19 }
  },
  "cropRecommendations": ["Wheat", "Barley", "Mustard"],
  "fertilizerPlan": "Apply 40 kg/acre urea at sowing...",
  "sevenDayPlan": "Day 1: Soil tilling...",
  "createdAt": "2024-08-01T10:30:00Z"
}
```

<br/>

---

## AMD Hardware Integration 🖥️

AgriSoil AI is purpose-built to leverage **AMD hardware** for high-performance AI inference and training.

| AMD Product | Role in AgriSoil AI |
|:------------|:--------------------|
| **AMD Ryzen Processor** | High-performance CPU for image preprocessing, GLCM feature extraction, and parallel data pipelines |
| **AMD Radeon GPU** | Accelerates deep learning via ROCm-supported PyTorch builds — MobileNetV2 inference, batch GPU extraction |
| **AMD-Powered Laptops/Desktops** | Cost-efficient local compute for model training, testing, and inference |
| **AMD EPYC Cloud Instances** | Scalable cloud training and production deployment |

**GPU Acceleration setup (ROCm):**

```bash
# Install PyTorch with ROCm support
pip install torch torchvision --index-url https://download.pytorch.org/whl/rocm5.6
```

> ⚡ CPU fallback is fully supported — AMD GPU is optional but dramatically speeds up batch inference.

<br/>

---

## 🛡️ Security & Reliability

| Area | Implementation |
|:-----|:--------------|
| **Authentication** | Firebase ID tokens verified server-side via Admin SDK on every protected request |
| **CORS** | Explicitly configured via environment variable — no wildcard origins |
| **Database** | MongoDB Atlas with TLS-encrypted URI — no plaintext credentials |
| **Zero Public Endpoints** | Both `/analyze` and `/history/{userId}` reject unauthenticated requests |
| **Secrets** | All credentials stored in `.env` — never committed to version control |
| **Error Handling** | All error states surfaced to the frontend (upload, geolocation, history) |
| **Loading States** | Granular loaders for: geolocation → weather → upload → history fetch |

<br/>

---

## Implementation Cost

AgriSoil AI is designed to be **low-cost and highly scalable** compared to traditional lab-based soil testing:

| Resource | Cost |
|:---------|:-----|
| Soil Image Capture | Smartphone camera — **zero hardware cost** |
| Model Training | Free/low-cost cloud credits (Google Colab, AMD Instinct) |
| Deployment | MongoDB Atlas free tier + Firebase free tier to start |
| Traditional Lab Alternative | Expensive equipment + expert technicians |

> Traditional soil testing requires lab equipment and expert technicians. AgriSoil AI replaces this with a smartphone photo.

<br/>

---

## 📊 Example Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         🌱 AGRISOIL AI — ANALYSIS REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SOIL PARAMETERS
─────────────────────────────────────────────
  Soil Type         :  Loam  (Confidence: 91%)
  pH Level          :  6.8   (Slightly Acidic)
  Moisture          :  38.4%
  GSM Metric        :  0.74

GRANULE ANALYSIS
─────────────────────────────────────────────
  Granule Count     :  312
  Average Size      :  2.4 mm
  Density           :  0.68
  Uniformity        :  0.81 (High)

TEXTURE ANALYSIS (GLCM)
─────────────────────────────────────────────
  Energy            :  0.52
  Contrast          :  0.19

WEATHER AT LOCATION
─────────────────────────────────────────────
  Temperature       :  28.5°C
  Humidity          :  64%

TOP CROP RECOMMENDATIONS
─────────────────────────────────────────────
  🥇  Wheat
  🥈  Barley
  🥉  Mustard

FERTILIZER PLAN
─────────────────────────────────────────────
  Apply 40 kg/acre urea at sowing stage.
  Top dress with 20 kg/acre DAP on Day 3.

7-DAY WORK PLAN
─────────────────────────────────────────────
  Day 1  →  Soil preparation and tilling
  Day 2  →  Seed bed creation
  Day 3  →  First irrigation + DAP application
  Day 5  →  Seed sowing (Wheat / Barley)
  Day 7  →  Post-sow inspection + moisture check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

<br/>

---

## Roadmap

| Status | Feature |
|:------:|:--------|
| ✅ | Core ML pipeline — soil type, pH, moisture, granule, texture |
| ✅ | Firebase authentication + protected endpoints |
| ✅ | Real-time weather integration |
| ✅ | Per-user analysis history |
| ✅ | AMD ROCm GPU acceleration support |
| ✅ | PDF / CSV report generation |
| 🔜 | Multi-language support (Hindi, New Comming Soon!) |
| 🔜 | Offline PWA mode |
| 🔜 | Live crop market price integration |
| 🔜 | SMS / WhatsApp alert system |
| 🔜 | Admin analytics dashboard |
| 🔜 | Satellite imagery overlay |
| 🔜 | SaaS billing & subscription tier |

<br/>

---

## Contributing

Contributions are always welcome!

```bash
# 1. Fork the repository
# 2. Create your feature branch
git checkout -b feature/amazing-feature

# 3. Commit your changes
git commit -m "feat: add amazing feature"

# 4. Push to your branch
git push origin feature/amazing-feature

# 5. Open a Pull Request 🎉
```

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

<br/>

---

## License

This project is licensed under the [MIT License](LICENSE).

<br/>

---

<div align="center">

*Built with 💚 by **Team ByteBenders** — AI For Sustainability | GreenTech Track*
## Team

Devashya Jethva · Chidatma Patel · Manthan Balani
<br/>

**If AgriSoil AI helped you, please consider giving it a ⭐ — it means a lot!**

[![Star on GitHub](https://img.shields.io/github/stars/DevashyaManojbhaiJethva/AMD-Slingshot?style=social)](https://github.com/DevashyaManojbhaiJethva/AMD-Slingshot)

</div>
