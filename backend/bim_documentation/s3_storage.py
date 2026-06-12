"""
MinIO/S3 Storage utility for uploading BIM documentation files.
Handles upload to S3 Storage buckets and generates public URLs.
"""
from decouple import config
import logging
from datetime import datetime
from django.conf import settings
import boto3
from botocore.exceptions import ClientError
from core.storage_utils import build_storage_public_url

logger = logging.getLogger(__name__)

# S3/MinIO configuration
BIM_DOCS_BUCKET = config('MINIO_BIM_BUCKET', default='bim-docs')

def get_s3_client():
    return boto3.client(
        's3',
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
    )

def upload_file_to_s3(file_obj, doc_id):
    """
    Upload a file to S3 Storage bucket.
    """
    try:
        client = get_s3_client()
        now = datetime.now()
        file_path = f"{doc_id}/{now.year}/{now.month:02d}/{now.day:02d}/{file_obj.name}"
        
        logger.info(f"Uploading file to S3 bucket '{BIM_DOCS_BUCKET}' at path: {file_path}")
        
        client.upload_fileobj(
            file_obj, 
            BIM_DOCS_BUCKET, 
            file_path,
            ExtraArgs={'ContentType': file_obj.content_type or 'application/octet-stream', 'ACL': 'public-read'}
        )
        
        public_url = build_storage_public_url(BIM_DOCS_BUCKET, file_path)
        
        return {
            'success': True,
            'file_path': file_path,
            'file_url': public_url,
            'error': None
        }
    except Exception as e:
        error_msg = f"S3 upload error: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {
            'success': False,
            'file_path': None,
            'file_url': None,
            'error': error_msg
        }

def delete_file_from_s3(file_path):
    try:
        client = get_s3_client()
        client.delete_object(Bucket=BIM_DOCS_BUCKET, Key=file_path)
        return {'success': True, 'error': None}
    except Exception as e:
        return {'success': False, 'error': str(e)}
