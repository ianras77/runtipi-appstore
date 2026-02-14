import json
from typing import Any

import boto3
from botocore.exceptions import ClientError

from .settings import settings


def _endpoint_url() -> str:
  scheme = "https" if settings.minio_secure else "http"
  return f"{scheme}://{settings.minio_endpoint}"


def get_s3_client():
  return boto3.client(
    "s3",
    endpoint_url=_endpoint_url(),
    aws_access_key_id=settings.minio_access_key,
    aws_secret_access_key=settings.minio_secret_key,
    region_name="us-east-1"
  )


def ensure_bucket(client, bucket: str) -> None:
  try:
    client.head_bucket(Bucket=bucket)
  except ClientError:
    client.create_bucket(Bucket=bucket)


def upload_json(client, bucket: str, key: str, payload: Any) -> None:
  body = json.dumps(payload, default=str).encode("utf-8")
  client.put_object(Bucket=bucket, Key=key, Body=body, ContentType="application/json")
