from __future__ import annotations

import firebase_admin
from firebase_admin import auth, credentials

from app.config import settings


_initialized = False


def initialize_firebase() -> None:
    global _initialized
    if _initialized:
        return

    if settings.firebase_service_account_path:
        firebase_cred = credentials.Certificate(settings.firebase_service_account_path)
        firebase_admin.initialize_app(firebase_cred)
    else:
        firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id})

    _initialized = True


def verify_firebase_token(id_token: str) -> dict:
    initialize_firebase()
    return auth.verify_id_token(id_token, check_revoked=False)
