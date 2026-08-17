import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, documents
from app.storage.s3 import ensure_bucket


_STANDARD_ATTRS = set(logging.makeLogRecord({}).__dict__.keys())


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        import json

        log = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%SZ"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log["exception"] = self.formatException(record.exc_info)
        for key, value in record.__dict__.items():
            if key not in _STANDARD_ATTRS:
                log[key] = value
        return json.dumps(log, default=str)


handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JSONFormatter())
root = logging.getLogger()
root.handlers = [handler]
root.setLevel(logging.INFO)

logger = logging.getLogger("notevault")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup", extra={"event": "startup"})
    try:
        ensure_bucket()
        logger.info("bucket_ready", extra={"bucket": settings.S3_BUCKET_NAME})
    except Exception as exc:  # pragma: no cover - best effort
        logger.warning("bucket_check_failed", extra={"error": str(exc)})
    yield
    logger.info("shutdown", extra={"event": "shutdown"})


app = FastAPI(title="NoteVault API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
