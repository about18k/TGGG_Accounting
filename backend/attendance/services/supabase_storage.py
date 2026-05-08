"""MinIO/S3 Storage Service for Work Documentation Files."""

import os
import json
import logging
from datetime import datetime
from django.conf import settings
import boto3
from botocore.exceptions import ClientError

# Set up logging
logger = logging.getLogger(__name__)


class SupabaseStorageManager:
    """Manages file uploads and retrieval from MinIO storage (originally Supabase)."""
    
    _client = None
    
    @classmethod
    def get_client(cls):
        """Get or create S3 client (singleton)."""
        if cls._client is None:
            cls._client = boto3.client(
                's3',
                endpoint_url=settings.AWS_S3_ENDPOINT_URL,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
        return cls._client
    
    @classmethod
    def validate_file(cls, file_obj, max_size_mb: int = 25) -> tuple[bool, str]:
        max_size_bytes = max_size_mb * 1024 * 1024
        if file_obj.size > max_size_bytes:
            return False, f"File size exceeds {max_size_mb}MB limit"
        
        allowed_extensions = {
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp',
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
            'txt', 'csv'
        }
        
        name_parts = file_obj.name.rsplit('.', 1)
        if len(name_parts) < 2:
            return False, "File must have an extension"
        
        extension = name_parts[1].lower()
        
        if extension not in allowed_extensions:
            return False, f"File type '{extension}' not allowed."
        
        return True, ""
    
    @classmethod
    def upload_work_documentation(
        cls,
        file_obj,
        user_id: int,
        date_str: str,
        employee_id: int,
        bucket_name: str = "work-attachments"
    ) -> dict:
        try:
            from accounts.models import CustomUser
            user = CustomUser.objects.get(id=user_id)
            is_admin = user.is_staff or user.is_superuser
            is_owner = employee_id == user_id
            
            if not (is_admin or is_owner):
                return {'success': False, 'error': 'You can only upload documentation for yourself'}
        except Exception as e:
            return {'success': False, 'error': f'User validation failed: {str(e)}'}
        
        is_valid, error_msg = cls.validate_file(file_obj)
        if not is_valid:
            return {'success': False, 'error': error_msg}
        
        try:
            client = cls.get_client()
            file_path = f"work-docs/{employee_id}/{date_str}/{file_obj.name}"
            
            client.upload_fileobj(
                file_obj,
                bucket_name,
                file_path,
                ExtraArgs={'ContentType': file_obj.content_type, 'ACL': 'public-read'}
            )
            
            file_url = f"{settings.AWS_S3_ENDPOINT_URL}/{bucket_name}/{file_path}"
            
            return {
                'success': True,
                'file_path': file_path,
                'file_url': file_url,
                'filename': file_obj.name,
                'uploaded_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def delete_work_documentation(
        cls,
        file_path: str,
        user_id: int,
        employee_id: int,
        bucket_name: str = "work-attachments"
    ) -> dict:
        try:
            client = cls.get_client()
            client.delete_object(Bucket=bucket_name, Key=file_path)
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def get_public_url(cls, file_path: str, bucket_name: str = "work-attachments") -> str:
        return f"{settings.AWS_S3_ENDPOINT_URL}/{bucket_name}/{file_path}"

    @classmethod
    def list_work_documentation_files(
        cls,
        employee_id: int,
        date_str: str,
        bucket_name: str = "work-attachments"
    ) -> dict:
        try:
            client = cls.get_client()
            folder_path = f"work-docs/{employee_id}/{date_str}/"
            
            response = client.list_objects_v2(Bucket=bucket_name, Prefix=folder_path)
            files = []
            
            if 'Contents' in response:
                for item in response['Contents']:
                    if item['Key'].endswith('/'):
                        continue
                    
                    file_path = item['Key']
                    filename = file_path.split('/')[-1]
                    file_url = f"{settings.AWS_S3_ENDPOINT_URL}/{bucket_name}/{file_path}"
                    
                    files.append({
                        'filename': filename,
                        'file_path': file_path,
                        'file_url': file_url,
                    })
            
            return {'success': True, 'files': files}
            
        except Exception as e:
            return {'success': False, 'files': [], 'error': str(e)}