from urllib.parse import urlparse

from django.conf import settings


def get_storage_public_base_url() -> str:
    """
    Resolve the public base URL used by clients to access MinIO objects.
    Priority:
    1) MINIO_PUBLIC_ENDPOINT
    2) AWS_S3_CUSTOM_DOMAIN
    3) AWS_S3_ENDPOINT_URL
    """
    candidates = [
        getattr(settings, "MINIO_PUBLIC_ENDPOINT", ""),
        getattr(settings, "AWS_S3_CUSTOM_DOMAIN", ""),
        getattr(settings, "AWS_S3_ENDPOINT_URL", ""),
    ]

    for value in candidates:
        if not value:
            continue
        base = str(value).strip().rstrip("/")
        if not base:
            continue
        if "://" not in base:
            base = f"https://{base}"
        return base

    return ""


def build_storage_public_url(bucket_name: str, object_key: str) -> str:
    base = get_storage_public_base_url()
    key = str(object_key or "").lstrip("/")
    if not base or not bucket_name or not key:
        return ""
    return f"{base}/{bucket_name}/{key}"


def extract_object_key_from_url(file_url: str, bucket_name: str) -> str:
    """
    Return object key from URLs like:
    - https://minio.triplegph.com/<bucket>/<key>
    - http://minio:9000/<bucket>/<key>
    - https://<supabase>/storage/v1/object/public/<bucket>/<key> (Legacy support)
    """
    if not file_url or not bucket_name:
        return ""

    marker = f"{bucket_name}/"
    if marker in file_url:
        return file_url.split(marker, 1)[1]

    parsed = urlparse(file_url)
    path = (parsed.path or "").lstrip("/")
    if path.startswith(marker):
        return path[len(marker):]

    return ""
