import importlib.util
import os
import tempfile
import zipfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent


def _resolve_training_file() -> Path:
    env_path = os.getenv("TRAINING_SCRIPT", "").strip()
    if env_path:
        candidate = Path(env_path).expanduser().resolve()
        if candidate.exists():
            return candidate
        raise FileNotFoundError(f"TRAINING_SCRIPT path not found: {candidate}")

    preferred = [
        BASE_DIR / "train_gpu (2) (1).py",
        BASE_DIR / "train_gpu.py",
    ]
    for path in preferred:
        if path.exists():
            return path

    py_candidates = [
        p for p in BASE_DIR.glob("*.py")
        if p.name.lower() != "api.py"
    ]
    if py_candidates:
        for candidate in py_candidates:
            try:
                text = candidate.read_text(encoding="utf-8", errors="ignore")
                if "class SoilPredictor" in text:
                    return candidate
            except Exception:
                pass
        raise FileNotFoundError(
            "Python files were found, but none contains 'class SoilPredictor'. "
            "Use your training script that defines SoilPredictor."
        )

    zip_path = BASE_DIR / "smart_agri_ai.zip"
    if zip_path.exists():
        runtime_dir = BASE_DIR / ".api_runtime"
        runtime_dir.mkdir(parents=True, exist_ok=True)

        with zipfile.ZipFile(zip_path, "r") as zf:
            names = [n for n in zf.namelist() if n.lower().endswith(".py")]
            if names:
                target_name = None

                for name in names:
                    try:
                        text = zf.read(name).decode("utf-8", errors="ignore")
                        if "class SoilPredictor" in text:
                            target_name = name
                            break
                    except Exception:
                        continue

                if target_name is None:
                    raise FileNotFoundError(
                        "smart_agri_ai.zip does not include a Python file containing "
                        "'class SoilPredictor'. Add your training script to this folder "
                        "or set environment variable TRAINING_SCRIPT to its path."
                    )

                extracted_path = Path(zf.extract(target_name, path=runtime_dir)).resolve()
                return extracted_path

    raise FileNotFoundError(
        "No training Python file found. Place your training script in this folder "
        "(for example 'train_gpu.py') or include it in smart_agri_ai.zip."
    )


TRAIN_FILE = _resolve_training_file()


def _load_training_module() -> Any:
    if not TRAIN_FILE.exists():
        raise FileNotFoundError(f"Training file not found: {TRAIN_FILE}")

    spec = importlib.util.spec_from_file_location("soil_train_module", TRAIN_FILE)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load training module spec")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


training_module = _load_training_module()
SoilPredictor = training_module.SoilPredictor

app = FastAPI(title="Soil Analysis API", version="1.0.0")
_predictor: SoilPredictor | None = None

origins_env = os.getenv("CORS_ORIGINS", "*").strip()
allow_origins = ["*"] if origins_env == "*" else [o.strip() for o in origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    global _predictor
    _predictor = SoilPredictor(model_dir=str(BASE_DIR / "soil_models_gpu"))


@app.get("/health")
def health() -> dict[str, str]:
    status = "ready" if _predictor is not None else "loading"
    return {"status": status}


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> dict[str, Any]:
    if _predictor is None:
        raise HTTPException(status_code=503, detail="Model is not loaded yet")

    suffix = Path(file.filename or "upload.jpg").suffix or ".jpg"

    temp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_path = temp_file.name
            content = await file.read()
            temp_file.write(content)

        result = _predictor.predict(temp_path)
        return {"ok": True, "result": result}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
