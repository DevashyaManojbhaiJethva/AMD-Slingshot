import argparse
import pickle
from pathlib import Path
from typing import Dict

import torch

MODEL_FILES = [
    "soil_model.pkl",
    "label_encoder.pkl",
    "moist_model.pkl",
    "ph_model.pkl",
    "gsm_model.pkl",
    "input_layer.pkl",
    "granule_knn.pkl",
    "config.pkl",
]


def build_bundle(model_dir: Path) -> Dict[str, object]:
    bundle: Dict[str, object] = {
        "format": "soil-analysis-bundle-v1",
        "source_model_dir": str(model_dir.resolve()),
        "files": {},
    }

    for name in MODEL_FILES:
        file_path = model_dir / name
        if not file_path.exists():
            raise FileNotFoundError(f"Missing required file: {file_path}")
        bundle["files"][name] = file_path.read_bytes()

    return bundle


def save_bundle(model_dir: Path, output_file: Path) -> Path:
    bundle = build_bundle(model_dir)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    torch.save(bundle, output_file)
    return output_file


def restore_bundle(pth_file: Path, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    bundle = torch.load(pth_file, map_location="cpu", weights_only=False)

    if bundle.get("format") != "soil-analysis-bundle-v1":
        raise ValueError("Unsupported bundle format")

    files = bundle.get("files", {})
    for name, data in files.items():
        (output_dir / name).write_bytes(data)

    return output_dir


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert soil .pkl models into one .pth bundle")
    parser.add_argument("--model-dir", default="soil_models_gpu", help="Folder containing .pkl files")
    parser.add_argument("--out", default="soil_models_gpu/model_bundle.pth", help="Output .pth file")
    parser.add_argument("--restore", default="", help="Optional: restore .pth into this folder")

    args = parser.parse_args()
    model_dir = Path(args.model_dir)
    out_file = Path(args.out)

    saved = save_bundle(model_dir, out_file)
    print(f"Saved: {saved}")

    if args.restore:
        restore_dir = Path(args.restore)
        restored = restore_bundle(saved, restore_dir)
        print(f"Restored files to: {restored}")


if __name__ == "__main__":
    main()
