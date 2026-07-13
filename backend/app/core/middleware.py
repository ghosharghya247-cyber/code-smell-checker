from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi import FastAPI
from app.core.config import get_settings

settings = get_settings()


def add_middleware(app: FastAPI):
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"],
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    return app
