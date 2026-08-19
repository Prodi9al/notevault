import logging
import os

import boto3
from botocore.client import Config

from app.config import settings

logger = logging.getLogger("notevault")

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".png", ".jpg"}
MAX_FILE_SIZE = 25 * 1024 * 1024


def get_s3_client():
    """Return a boto3 S3 client for backend-side operations (MinIO/AWS).

    Works with both MinIO (local) and real AWS S3:
      - If AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are set, use them.
      - If S3_ENDPOINT_URL is set (local MinIO), point at it.
      - If neither is set, credentials are sourced from the EC2 IAM instance
        role automatically (no explicit keys needed in prod).
    """
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL or None,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
        region_name=settings.S3_REGION or None,
        config=Config(signature_version="s3v4"),
    )


def get_presign_client():
    """Return a boto3 client used only to *generate* presigned URLs.

    Presigned URLs are signed against the endpoint host, so the host in the
    URL must match where the *browser* will actually send the request.
    Using S3_PUBLIC_ENDPOINT_URL as the signing endpoint avoids the broken
    pattern of rewriting the host after signing (which invalidates the
    signature and yields 403s). No network calls are made by this client.
    """
    presign_endpoint = settings.S3_PUBLIC_ENDPOINT_URL or settings.S3_ENDPOINT_URL or None
    return boto3.client(
        "s3",
        endpoint_url=presign_endpoint,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
        region_name=settings.S3_REGION or None,
        config=Config(signature_version="s3v4"),
    )


CORS_CONFIGURATION = {
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3600,
        }
    ]
}


def ensure_bucket() -> None:
    client = get_s3_client()
    try:
        client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
    except client.exceptions.ClientError:
        client.create_bucket(Bucket=settings.S3_BUCKET_NAME)
    try:
        client.put_bucket_cors(
            Bucket=settings.S3_BUCKET_NAME, CORSConfiguration=CORS_CONFIGURATION
        )
    except client.exceptions.ClientError:
        pass


def validate_upload(filename: str, content_type: str, size: int) -> None:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    if size > MAX_FILE_SIZE:
        raise ValueError(
            f"File too large ({size} bytes). Max allowed: {MAX_FILE_SIZE} bytes."
        )


def generate_upload_presigned_url(
    s3_key: str, content_type: str, expires_in: int = 900
) -> str:
    client = get_presign_client()
    return client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.S3_BUCKET_NAME,
            "Key": s3_key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_in,
    )


def generate_download_presigned_url(s3_key: str, expires_in: int = 300) -> str:
    client = get_presign_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
        ExpiresIn=expires_in,
    )


def delete_object(s3_key: str) -> None:
    client = get_s3_client()
    client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
