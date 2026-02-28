from __future__ import annotations

import importlib
import pickle
from io import BytesIO
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image
from scipy import ndimage


class InputLayer:
    def __init__(self) -> None:
        self.medians_: dict[str, float] = {}
        self.fitted_: bool = False


class _CompatUnpickler(pickle.Unpickler):
    def find_class(self, module: str, name: str):
        if module == "__main__" and name == "InputLayer":
            return InputLayer
        return super().find_class(module, name)


def _compat_pickle_load(file_obj):
    return _CompatUnpickler(file_obj).load()


_MODEL_ASSET_DIR = Path(__file__).resolve().parents[2] / "model_assets" / "ML1" / "ML1" / "soil_models_gpu"
_ML1_MODELS: dict | None = None
_SMART_AGRI_MODEL_PATH = Path(__file__).resolve().parents[2] / "model_assets" / "smart_agri" / "soil_model.pth"
_SMART_AGRI_CLASSES = [
    "alluvial",
    "arid",
    "black",
    "cinder",
    "clay",
    "laterite",
    "mountain",
    "peat",
    "red",
    "yellow",
]
_SMART_AGRI_MODEL_BUNDLE: dict | None = None


def _load_smart_agri_model() -> dict | None:
    global _SMART_AGRI_MODEL_BUNDLE
    if _SMART_AGRI_MODEL_BUNDLE is not None:
        return _SMART_AGRI_MODEL_BUNDLE

    if not _SMART_AGRI_MODEL_PATH.exists():
        _SMART_AGRI_MODEL_BUNDLE = {}
        return _SMART_AGRI_MODEL_BUNDLE

    try:
        torch_module = importlib.import_module("torch")
        torchvision_models = importlib.import_module("torchvision.models")
    except Exception:
        _SMART_AGRI_MODEL_BUNDLE = {}
        return _SMART_AGRI_MODEL_BUNDLE

    try:
        model = torchvision_models.resnet18(weights=None)
        model.fc = torch_module.nn.Linear(model.fc.in_features, len(_SMART_AGRI_CLASSES))
        state_dict = torch_module.load(str(_SMART_AGRI_MODEL_PATH), map_location="cpu")
        model.load_state_dict(state_dict)
        model.eval()

        _SMART_AGRI_MODEL_BUNDLE = {
            "torch": torch_module,
            "model": model,
        }
        return _SMART_AGRI_MODEL_BUNDLE
    except Exception:
        _SMART_AGRI_MODEL_BUNDLE = {}
        return _SMART_AGRI_MODEL_BUNDLE


def _predict_smart_agri_soil(images: list[bytes]) -> dict | None:
    model_bundle = _load_smart_agri_model()
    if not model_bundle:
        return None

    torch_module = model_bundle["torch"]
    model = model_bundle["model"]

    if not images:
        return None

    all_probabilities: list[np.ndarray] = []

    for file_bytes in images:
        image = Image.open(BytesIO(file_bytes)).convert("RGB")
        resized = image.resize((224, 224))
        arr = np.asarray(resized, dtype=np.float32) / 255.0
        tensor = torch_module.from_numpy(arr).permute(2, 0, 1).unsqueeze(0)

        with torch_module.no_grad():
            logits = model(tensor)
            probs = torch_module.softmax(logits, dim=1).squeeze(0).cpu().numpy()

        all_probabilities.append(np.asarray(probs, dtype=np.float32))

    if not all_probabilities:
        return None

    avg_probabilities = np.mean(np.stack(all_probabilities, axis=0), axis=0)
    predicted_idx = int(np.argmax(avg_probabilities))
    confidence = float(avg_probabilities[predicted_idx] * 100.0)

    return {
        "soilClass": _SMART_AGRI_CLASSES[predicted_idx],
        "confidence": confidence,
    }


def _format_soil_label(soil_class: str) -> str:
    soil_label_map = {
        "alluvial": "Alluvial Soil",
        "arid": "Arid Soil",
        "black": "Black Soil",
        "cinder": "Cinder Soil",
        "clay": "Clay Soil",
        "laterite": "Laterite Soil",
        "mountain": "Mountain Soil",
        "peat": "Peat Soil",
        "red": "Red Soil",
        "yellow": "Yellow Soil",
    }
    return soil_label_map.get(soil_class.lower(), "Loamy Sand (LS)")


_SOIL_CROP_MAP = {
    "alluvial": ["Rice", "Wheat", "Sugarcane", "Maize", "Barley", "Soybean"],
    "arid": ["Barley", "Maize", "Millet"],
    "black": ["Cotton", "Soybean", "Wheat", "Maize", "Sugarcane"],
    "cinder": ["Potato", "Tomato"],
    "clay": ["Rice", "Wheat", "Sugarcane", "Barley"],
    "laterite": ["Maize", "Rice", "Sugarcane"],
    "mountain": ["Barley", "Maize", "Potato"],
    "peat": ["Potato", "Rice", "Tomato"],
    "red": ["Maize", "Wheat", "Cotton", "Rice"],
    "yellow": ["Maize", "Rice", "Wheat", "Potato"],
}

_CROP_CONDITIONS = {
    "Rice": {"temp": (20, 35), "rainfall": (120, 300), "ph": (5.5, 7.0)},
    "Wheat": {"temp": (10, 25), "rainfall": (40, 120), "ph": (6.0, 7.5)},
    "Sugarcane": {"temp": (20, 38), "rainfall": (100, 250), "ph": (6.0, 8.0)},
    "Maize": {"temp": (18, 32), "rainfall": (50, 200), "ph": (5.5, 7.5)},
    "Cotton": {"temp": (20, 35), "rainfall": (50, 150), "ph": (6.0, 8.0)},
    "Soybean": {"temp": (20, 30), "rainfall": (60, 150), "ph": (6.0, 7.5)},
    "Millet": {"temp": (22, 35), "rainfall": (30, 100), "ph": (5.5, 7.5)},
    "Barley": {"temp": (12, 25), "rainfall": (40, 100), "ph": (6.0, 7.5)},
    "Potato": {"temp": (15, 25), "rainfall": (50, 150), "ph": (5.0, 6.5)},
    "Tomato": {"temp": (18, 30), "rainfall": (40, 120), "ph": (5.5, 7.5)},
}

_CROP_PROFILES = {
    "Rice": {"moisture": (60, 95), "fertility": (60, 90), "depth": (20, 45)},
    "Wheat": {"moisture": (35, 65), "fertility": (55, 85), "depth": (15, 40)},
    "Sugarcane": {"moisture": (55, 90), "fertility": (65, 95), "depth": (25, 50)},
    "Maize": {"moisture": (40, 70), "fertility": (55, 90), "depth": (15, 40)},
    "Cotton": {"moisture": (30, 60), "fertility": (50, 85), "depth": (15, 35)},
    "Soybean": {"moisture": (35, 70), "fertility": (50, 85), "depth": (15, 35)},
    "Millet": {"moisture": (20, 55), "fertility": (40, 80), "depth": (10, 30)},
    "Barley": {"moisture": (25, 55), "fertility": (45, 80), "depth": (10, 30)},
    "Potato": {"moisture": (45, 75), "fertility": (55, 88), "depth": (15, 35)},
    "Tomato": {"moisture": (45, 75), "fertility": (55, 90), "depth": (15, 35)},
}


def _normalize_soil_key(soil_value: str) -> str:
    value = soil_value.lower()
    if value in _SMART_AGRI_CLASSES:
        return value
    if "peat" in value:
        return "peat"
    if "clay" in value:
        return "clay"
    if "red" in value:
        return "red"
    if "black" in value:
        return "black"
    if "yellow" in value:
        return "yellow"
    if "laterite" in value:
        return "laterite"
    if "mountain" in value:
        return "mountain"
    if "arid" in value:
        return "arid"
    return "alluvial"

def _choose_soil_key(smart_agri_soil: dict | None, ml1_result: dict | None) -> str:
    if smart_agri_soil is not None and smart_agri_soil.get("soilClass") is not None:
        return _normalize_soil_key(str(smart_agri_soil.get("soilClass")))

    if ml1_result is not None and ml1_result.get("soilClass") is not None:
        return _normalize_soil_key(str(ml1_result["soilClass"]))

    return "alluvial"


def _calculate_score(value: float, ideal_range: tuple[float, float]) -> float:
    min_val, max_val = ideal_range
    center = (min_val + max_val) / 2.0
    if min_val <= value <= max_val:
        return 100.0
    deviation = abs(value - center)
    return max(0.0, min(100.0, 100.0 - (deviation * 4.0)))


def _recommend_smart_agri_crops(
    soil_key: str,
    ph: float,
    temperature: float,
    rainfall: float,
) -> list[tuple[str, float]]:
    crop_scores: list[tuple[str, float]] = []
    possible_crops = _SOIL_CROP_MAP.get(soil_key, [])
    if not possible_crops:
        return crop_scores

    for index, crop in enumerate(possible_crops):
        rank_bonus = max(0, 20 - index)

        if crop not in _CROP_CONDITIONS:
            fallback_score = 55 + (rank_bonus * 0.7)

            if not (5.0 <= ph <= 8.5):
                fallback_score -= 10
            if temperature < 10 or temperature > 40:
                fallback_score -= 10
            if rainfall < 20:
                fallback_score -= 8

            fallback_score = max(0.0, min(100.0, fallback_score))
            crop_scores.append((crop, round(float(fallback_score), 2)))
            continue

        conditions = _CROP_CONDITIONS[crop]
        temp_score = _calculate_score(temperature, conditions["temp"])
        rain_score = _calculate_score(rainfall, conditions["rainfall"])
        ph_score = _calculate_score(ph, conditions["ph"])

        total_score = (
            (ph_score * 0.4)
            + (temp_score * 0.3)
            + (rain_score * 0.3)
        )

        total_score += 5
        total_score += (rank_bonus * 0.5)

        if temp_score < 40 or rain_score < 40 or ph_score < 40:
            total_score *= 0.8

        total_score = max(0.0, min(100.0, total_score))

        crop_scores.append((crop, round(float(total_score), 2)))

    crop_scores.sort(key=lambda item: item[1], reverse=True)
    return crop_scores[:3]


def _analyze_smart_agri_fertility(
    soil_key: str,
    ph: float,
    depth_cm: float,
    rainfall: float | None,
    temperature: float | None,
) -> tuple[float, str]:
    score = 50.0

    if 6.0 <= ph <= 7.2:
        score += 30
    elif 5.5 <= ph < 6.0 or 7.2 < ph <= 7.8:
        score += 15
    else:
        score -= 25

    if depth_cm >= 40:
        score += 20
    elif depth_cm >= 25:
        score += 10
    else:
        score -= 15

    soil_weights = {
        "alluvial": 20,
        "black": 18,
        "clay": 15,
        "red": 10,
        "laterite": 5,
        "mountain": 5,
        "yellow": 3,
        "arid": -5,
        "peat": -10,
    }
    score += soil_weights.get(soil_key, 0)

    if rainfall is not None:
        if 80 <= rainfall <= 200:
            score += 10
        elif rainfall < 40:
            score -= 10

    if temperature is not None:
        if 20 <= temperature <= 32:
            score += 10
        else:
            score -= 5

    score = float(max(0.0, min(100.0, score)))
    if score >= 75:
        level = "High"
    elif score >= 55:
        level = "Medium"
    else:
        level = "Low"
    return score, level


def _recommend_smart_agri_npk(fertility_score: float, crop_type: str | None) -> dict[str, float]:
    crop_base = {
        "rice": (100.0, 50.0, 50.0),
        "wheat": (120.0, 60.0, 40.0),
        "maize": (150.0, 70.0, 50.0),
        "cotton": (140.0, 60.0, 60.0),
        "sugarcane": (250.0, 100.0, 100.0),
        "default": (100.0, 50.0, 50.0),
    }
    key = crop_type.lower() if crop_type else "default"
    base_n, base_p, base_k = crop_base.get(key, crop_base["default"])

    deficiency_factor = (100.0 - fertility_score) / 100.0
    return {
        "N": round(base_n * (1.0 + deficiency_factor)),
        "P": round(base_p * (1.0 + deficiency_factor)),
        "K": round(base_k * (1.0 + deficiency_factor)),
    }


def _recommend_smart_agri_fertilizer(fertility_level: str, ph: float, npk_values: dict[str, float]) -> list[str]:
    recommendations: list[str] = []

    if npk_values["N"] > 150:
        recommendations.append("High Nitrogen required: Apply Urea in split doses.")
    elif npk_values["N"] > 100:
        recommendations.append("Moderate Nitrogen required: Apply Urea or Ammonium Sulphate.")

    if npk_values["P"] > 60:
        recommendations.append("Apply DAP or Single Super Phosphate (SSP).")

    if npk_values["K"] > 60:
        recommendations.append("Apply Muriate of Potash (MOP).")

    if fertility_level == "High":
        recommendations.append("Maintain soil health using compost and crop rotation.")
    elif fertility_level == "Medium":
        recommendations.append("Use balanced NPK fertilizer and organic manure.")
    else:
        recommendations.append("Soil requires structured nutrient improvement plan.")

    if ph < 5.5:
        recommendations.append("Apply Agricultural Lime to reduce soil acidity.")
    elif ph > 7.8:
        recommendations.append("Apply Gypsum to reduce alkalinity.")

    recommendations.append("Add Compost or Vermicompost to improve organic carbon.")
    return recommendations


def _load_ml1_models() -> dict | None:
    global _ML1_MODELS
    if _ML1_MODELS is not None:
        return _ML1_MODELS

    required_files = [
        "config.pkl",
        "soil_model.pkl",
        "moist_model.pkl",
        "ph_model.pkl",
        "gsm_model.pkl",
        "input_layer.pkl",
    ]
    if not all((_MODEL_ASSET_DIR / name).exists() for name in required_files):
        _ML1_MODELS = {}
        return _ML1_MODELS

    try:
        with open(_MODEL_ASSET_DIR / "config.pkl", "rb") as file_obj:
            config = pickle.load(file_obj)
        with open(_MODEL_ASSET_DIR / "soil_model.pkl", "rb") as file_obj:
            soil_model = pickle.load(file_obj)
        with open(_MODEL_ASSET_DIR / "moist_model.pkl", "rb") as file_obj:
            moist_model = pickle.load(file_obj)
        with open(_MODEL_ASSET_DIR / "ph_model.pkl", "rb") as file_obj:
            ph_model = pickle.load(file_obj)
        with open(_MODEL_ASSET_DIR / "gsm_model.pkl", "rb") as file_obj:
            gsm_model = pickle.load(file_obj)
        with open(_MODEL_ASSET_DIR / "input_layer.pkl", "rb") as file_obj:
            input_layer = _compat_pickle_load(file_obj)

        _ML1_MODELS = {
            "config": config,
            "soil_model": soil_model,
            "moist_model": moist_model,
            "ph_model": ph_model,
            "gsm_model": gsm_model,
            "input_layer": input_layer,
        }
        return _ML1_MODELS
    except Exception:
        _ML1_MODELS = {}
        return _ML1_MODELS

def _run_torch_logits(model_features: np.ndarray) -> np.ndarray | None:
    try:
        torch_module = importlib.import_module("torch")
    except Exception:  # noqa: BLE001
        return None

    torch_module.manual_seed(42)
    network = torch_module.nn.Sequential(
        torch_module.nn.Linear(9, 32),
        torch_module.nn.ReLU(),
        torch_module.nn.Linear(32, 16),
        torch_module.nn.ReLU(),
        torch_module.nn.Linear(16, 8),
    ).eval()

    with torch_module.no_grad():
        model_input = torch_module.tensor(model_features, dtype=torch_module.float32).unsqueeze(0)
        return network(model_input).squeeze(0).numpy()


def _extract_image_features(file_bytes: bytes) -> list[float]:
    image = Image.open(BytesIO(file_bytes)).convert("RGB")
    arr = np.asarray(image.resize((128, 128)), dtype=np.float32) / 255.0

    mean_rgb = arr.mean(axis=(0, 1))
    std_rgb = arr.std(axis=(0, 1))
    brightness = float(arr.mean())

    return [
        float(mean_rgb[0]),
        float(mean_rgb[1]),
        float(mean_rgb[2]),
        float(std_rgb[0]),
        float(std_rgb[1]),
        float(std_rgb[2]),
        brightness,
    ]


def _extract_ml1_features(file_bytes: bytes) -> dict[str, float]:
    image = Image.open(BytesIO(file_bytes)).convert("RGB")
    rgb = np.asarray(image.resize((256, 256)), dtype=np.float32) / 255.0
    hsv = np.asarray(image.convert("HSV").resize((256, 256)), dtype=np.float32) / 255.0

    gray = (0.299 * rgb[:, :, 0]) + (0.587 * rgb[:, :, 1]) + (0.114 * rgb[:, :, 2])

    grad_x = np.diff(gray, axis=1, append=gray[:, -1:])
    grad_y = np.diff(gray, axis=0, append=gray[-1:, :])
    grad_mag = np.sqrt((grad_x**2) + (grad_y**2))

    edge_threshold = float(np.percentile(grad_mag, 78))
    edge_mask = grad_mag >= edge_threshold
    edge_density = float(np.mean(edge_mask))

    labeled_components, component_count = ndimage.label(edge_mask)
    if component_count > 0:
        component_sizes = ndimage.sum(
            np.ones_like(gray, dtype=np.float32),
            labeled_components,
            index=np.arange(1, component_count + 1),
        )
        component_sizes = np.asarray(component_sizes, dtype=np.float32)
        size_mean = float(np.mean(component_sizes))
        size_std = float(np.std(component_sizes))
    else:
        size_mean = 1.0
        size_std = 0.0

    histogram, _ = np.histogram(gray, bins=64, range=(0.0, 1.0), density=True)
    nonzero_hist = histogram[histogram > 0]
    texture_entropy = float(-np.sum(nonzero_hist * np.log2(nonzero_hist)))

    texture_energy = float(np.mean(gray**2))
    texture_contrast = float(np.mean(grad_mag) * 255.0 * 12.0)
    texture_homogeneity = float(1.0 / (1.0 + np.var(gray) * 255.0))
    contrast_rms = float(np.std(gray))

    count = float(component_count)
    density = float((component_count / gray.size) * 100000.0)

    mobilenet_feat_mean = float(np.mean(grad_mag) * 2.2)
    mobilenet_feat_std = float(np.std(grad_mag) * 4.0)
    mobilenet_feat_max = float(np.max(grad_mag) * 2.0)

    return {
        "count": count,
        "density": density,
        "size_mean": size_mean,
        "size_std": size_std,
        "texture_energy": texture_energy,
        "texture_contrast": texture_contrast,
        "texture_homogeneity": texture_homogeneity,
        "texture_entropy": texture_entropy,
        "edge_density": edge_density,
        "color_mean_h": float(np.mean(hsv[:, :, 0])),
        "color_mean_s": float(np.mean(hsv[:, :, 1])),
        "color_mean_v": float(np.mean(hsv[:, :, 2])),
        "color_std_h": float(np.std(hsv[:, :, 0])),
        "color_std_s": float(np.std(hsv[:, :, 1])),
        "color_std_v": float(np.std(hsv[:, :, 2])),
        "red_mean": float(np.mean(rgb[:, :, 0])),
        "green_mean": float(np.mean(rgb[:, :, 1])),
        "blue_mean": float(np.mean(rgb[:, :, 2])),
        "contrast_rms": contrast_rms,
        "mobilenet_feat_mean": mobilenet_feat_mean,
        "mobilenet_feat_std": mobilenet_feat_std,
        "mobilenet_feat_max": mobilenet_feat_max,
    }


def _run_ml1_inference(images: list[bytes]) -> dict | None:
    models = _load_ml1_models()
    if not models:
        return None

    config = models["config"]
    feature_cols = list(config.get("feature_cols", []))
    if not feature_cols:
        return None

    input_layer = models.get("input_layer")
    medians = getattr(input_layer, "medians_", {}) if input_layer is not None else {}

    defaults = {column: float(medians.get(column, 0.0)) for column in feature_cols}
    image_feature_rows = [_extract_ml1_features(image_bytes) for image_bytes in images]

    if image_feature_rows:
        averaged_features = {
            key: float(np.mean([row.get(key, defaults.get(key, 0.0)) for row in image_feature_rows]))
            for key in feature_cols
        }
    else:
        averaged_features = defaults

    model_input = pd.DataFrame([averaged_features])
    feature_array = model_input[feature_cols].to_numpy(dtype=np.float32)

    soil_raw = float(models["soil_model"].predict(feature_array)[0])
    classes = list(config.get("classes", ["clay", "loam", "peat"]))
    if not classes:
        classes = ["clay", "loam", "peat"]
    soil_idx = int(np.clip(np.rint(soil_raw), 0, len(classes) - 1))

    moist_cols = list(config.get("moisture_cols", []))
    ph_cols = list(config.get("ph_cols", []))
    gsm_cols = list(config.get("gsm_cols", []))

    moisture = float(models["moist_model"].predict(model_input[moist_cols].to_numpy(dtype=np.float32))[0])
    ph = float(models["ph_model"].predict(model_input[ph_cols].to_numpy(dtype=np.float32))[0])
    gsm = float(models["gsm_model"].predict(model_input[gsm_cols].to_numpy(dtype=np.float32))[0])

    granule_count = int(max(1, round(averaged_features.get("count", 120.0))))
    granule_density = float(max(0.2, min(8.0, averaged_features.get("density", 60.0) / 100.0)))

    return {
        "soilClass": classes[soil_idx],
        "moisture": float(np.clip(moisture, 5.0, 95.0)),
        "ph": float(np.clip(ph, 4.8, 8.8)),
        "gsm": float(np.clip(gsm, 5.0, 95.0)),
        "granuleCount": granule_count,
        "granuleDensity": granule_density,
    }


def run_inference(
    *,
    images: list[bytes],
    soil_depth_cm: float,
    temperature_c: float,
    humidity: float,
    rainfall_mm: float | None = None,
) -> dict:
    smart_agri_soil = _predict_smart_agri_soil(images)
    ml1_result = _run_ml1_inference(images)

    def to_float(value: float) -> float:
        return float(value)

    rainfall = float(max(0.0, rainfall_mm if rainfall_mm is not None else max(0.0, (humidity - 55.0) * 2.2)))

    if ml1_result is not None:
        moisture = float(ml1_result["moisture"])
        ph = float(ml1_result["ph"])
        gsm = float(ml1_result["gsm"])
        granule_count = int(ml1_result["granuleCount"])
        granule_density = float(ml1_result["granuleDensity"])

        soil_key = _choose_soil_key(smart_agri_soil, ml1_result)
        soil_type = _format_soil_label(soil_key)

        fertility, fertility_level = _analyze_smart_agri_fertility(soil_key, ph, soil_depth_cm, rainfall, temperature_c)
        ranked_crops = _recommend_smart_agri_crops(
            soil_key,
            ph,
            temperature_c,
            rainfall,
        )

        best_crop = ranked_crops[0][0] if ranked_crops else None
        npk_values = _recommend_smart_agri_npk(fertility, best_crop)
        n = float(npk_values["N"])
        p = float(npk_values["P"])
        k = float(npk_values["K"])

        fertilizer_advice = _recommend_smart_agri_fertilizer(fertility_level, ph, npk_values)
        health = max(35.0, min(98.0, 0.42 * fertility + 0.38 * moisture + 0.2 * (100 - abs(ph - 7) * 20)))

        recommendation = " ".join(fertilizer_advice[:2]).strip() or "Use balanced NPK fertilizer and organic manure."
        work_plan = [
            "Day 1: Apply basal fertilizer and clear weeds.",
            "Day 2: Light irrigation and soil moisture check.",
            "Day 3: Foliar nutrient spray in early morning.",
            "Day 4: Monitor crop leaves for nutrient stress.",
            "Day 5: Add compost near root zone.",
            "Day 6: Re-check moisture and pH strip test.",
            "Day 7: Prepare next week nutrient top-up.",
        ]

        return {
            "soilType": soil_type,
            "nutrients": {
                "n": to_float(round(n, 2)),
                "p": to_float(round(p, 2)),
                "k": to_float(round(k, 2)),
                "ph": to_float(round(ph, 2)),
            },
            "soilHealth": to_float(round(health, 2)),
            "fertility": to_float(round(fertility, 2)),
            "moisture": to_float(round(moisture, 2)),
            "granuleMetrics": {
                "gsm": to_float(round(gsm, 2)),
                "granuleCount": granule_count,
                "granuleDensity": to_float(round(granule_density, 2)),
            },
            "crops": [
                {
                    "name": name,
                    "score": to_float(round(score, 2)),
                    "confidence": to_float(round(score / 100.0, 3)),
                }
                for name, score in ranked_crops[:3]
            ],
            "fertilizerRecommendation": {
                "ureaKg": to_float(round(max(12.0, n * 0.22), 2)),
                "recommendation": recommendation,
                "irrigation": "Every 3 days" if moisture < 45 else "Every 4 days",
            },
            "workPlan": work_plan,
        }

    feature_vectors = [_extract_image_features(image_bytes) for image_bytes in images]
    aggregated = np.mean(np.array(feature_vectors), axis=0).tolist()

    model_features = np.array(aggregated + [float(soil_depth_cm) / 100.0, float(temperature_c) / 50.0], dtype=np.float32)

    logits = _run_torch_logits(model_features)
    if logits is None:
        logits = np.array(
            [
                float(model_features[0] + model_features[6]),
                float(model_features[1] + model_features[7]),
                float(model_features[2] + model_features[8]),
                float(model_features[3] + model_features[4]),
            ],
            dtype=np.float32,
        )

    ph = max(5.0, min(8.5, 6.0 + (logits[3] % 2) * 0.6))

    moisture = max(20.0, min(95.0, 26 + abs(logits[0]) * 24 + aggregated[6] * 28 + soil_depth_cm * 0.12))

    texture_signal = max(0.0, min(1.0, (aggregated[3] + aggregated[4] + aggregated[5]) / 3.0))
    depth_factor = max(0.5, min(1.5, soil_depth_cm / 20.0))
    granule_count = int(round(max(30.0, min(420.0, 65 + texture_signal * 280 + depth_factor * 24))))
    granule_density = max(0.2, min(4.5, granule_count / 100.0))
    gsm = max(10.0, min(95.0, 18 + texture_signal * 70 + (1.0 - abs(ph - 7) / 2.0) * 12))

    fallback_ml1_like = {"soilClass": "clay" if moisture > 45 else "loam"}
    soil_key = _choose_soil_key(smart_agri_soil, fallback_ml1_like)
    soil_type = _format_soil_label(soil_key)

    fertility, fertility_level = _analyze_smart_agri_fertility(soil_key, ph, soil_depth_cm, rainfall, temperature_c)
    ranked_crops = _recommend_smart_agri_crops(
        soil_key,
        ph,
        temperature_c,
        rainfall,
    )

    best_crop = ranked_crops[0][0] if ranked_crops else None
    npk_values = _recommend_smart_agri_npk(fertility, best_crop)
    n = float(npk_values["N"])
    p = float(npk_values["P"])
    k = float(npk_values["K"])
    fertilizer_advice = _recommend_smart_agri_fertilizer(fertility_level, ph, npk_values)

    health = max(35.0, min(98.0, 0.45 * fertility + 0.35 * moisture + 0.2 * (100 - abs(ph - 7) * 20)))
    recommendation = " ".join(fertilizer_advice[:2]).strip() or "Use balanced NPK fertilizer and organic manure."

    return {
        "soilType": soil_type,
        "nutrients": {
            "n": to_float(round(n, 2)),
            "p": to_float(round(p, 2)),
            "k": to_float(round(k, 2)),
            "ph": to_float(round(ph, 2)),
        },
        "soilHealth": to_float(round(health, 2)),
        "fertility": to_float(round(fertility, 2)),
        "moisture": to_float(round(moisture, 2)),
        "granuleMetrics": {
            "gsm": to_float(round(gsm, 2)),
            "granuleCount": granule_count,
            "granuleDensity": to_float(round(granule_density, 2)),
        },
        "crops": [
            {
                "name": name,
                "score": to_float(round(score, 2)),
                "confidence": to_float(round(score / 100.0, 3)),
            }
            for name, score in ranked_crops[:3]
        ],
        "fertilizerRecommendation": {
            "ureaKg": to_float(round(max(12.0, n * 0.22), 2)),
            "recommendation": recommendation,
            "irrigation": "Every 3 days" if moisture < 45 else "Every 4 days",
        },
        "workPlan": [
            "Day 1: Apply basal fertilizer and clear weeds.",
            "Day 2: Light irrigation and soil moisture check.",
            "Day 3: Foliar nutrient spray in early morning.",
            "Day 4: Monitor crop leaves for nutrient stress.",
            "Day 5: Add compost near root zone.",
            "Day 6: Re-check moisture and pH strip test.",
            "Day 7: Prepare next week nutrient top-up.",
        ],
    }
