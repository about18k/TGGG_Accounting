"""
Supabase Storage utility for uploading BIM documentation files.
Handles upload to Supabase Storage buckets and generates public URLs.
"""
from decouple import config
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = config('SUPABASE_URL', default='')
SUPABASE_SERVICE_ROLE_KEY = (
    config('SUPABASE_SERVICE_ROLE_KEY', default='')
    or config('SUPABASE_SERVICE_KEY', default='')
)
SUPABASE_KEY = config('SUPABASE_KEY', default='')
SUPABASE_BUCKET = config('SUPABASE_STORAGE_BUCKET', default='bim-docs')


def get_supabase_client():
    """
    Get Supabase client for storage operations.
    Requires supabase-py package: pip install supabase
    """
    try:
        from supabase import create_client
        api_key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY
        if not api_key:
            raise ValueError('Missing Supabase key. Set SUPABASE_SERVICE_ROLE_KEY (recommended) or SUPABASE_KEY.')
        return create_client(SUPABASE_URL, api_key)
    except ImportError:
        logger.error("supabase package not installed. Install it with: pip install supabase")
        raise


def upload_file_to_supabase(file_obj, doc_id):
    """
    Upload a file to Supabase Storage bucket.
    
    Args:
        file_obj: Django File object from request.FILES
        doc_id: BIM Documentation ID
        
    Returns:
        dict: {
            'success': bool,
            'file_path': str,  # Path in bucket (e.g., 'bim-docs/123/filename.jpg')
            'file_url': str,   # Public URL
            'error': str or None
        }
    """
    try:
        if not SUPABASE_URL or not (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY):
            return {
                'success': False,
                'file_path': None,
                'file_url': None,
                'error': 'Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
            }
        
        client = get_supabase_client()
        
        # Generate file path: bim-docs/doc_id/YYYY/MM/DD/filename
        now = datetime.now()
        file_path = f"{doc_id}/{now.year}/{now.month:02d}/{now.day:02d}/{file_obj.name}"
        bucket_path = f"{SUPABASE_BUCKET}/{file_path}"
        
        # Read file content
        file_content = file_obj.read()
        file_obj.seek(0)  # Reset file pointer for potential re-reads
        
        # Upload to Supabase Storage
        response = client.storage.from_(SUPABASE_BUCKET).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": file_obj.content_type or "application/octet-stream"}
        )
        
        # Generate public URL
        public_url = client.storage.from_(SUPABASE_BUCKET).get_public_url(file_path)
        
        logger.info(f"File uploaded to Supabase: {bucket_path}")
        
        return {
            'success': True,
            'file_path': file_path,
            'file_url': public_url,
            'error': None
        }
        
    except Exception as e:
        error_msg = f"Supabase upload error: {str(e)}"
        logger.error(error_msg)
        return {
            'success': False,
            'file_path': None,
            'file_url': None,
            'error': error_msg
        }


def delete_file_from_supabase(file_path):
    """
    Delete a file from Supabase Storage bucket.
    
    Args:
        file_path: Path in bucket (e.g., 'doc_id/2026/03/24/filename.jpg')
        
    Returns:
        dict: {'success': bool, 'error': str or None}
    """
    try:
        if not SUPABASE_URL or not (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY):
            return {
                'success': False,
                'error': 'Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
            }
        
        client = get_supabase_client()
        client.storage.from_(SUPABASE_BUCKET).remove([file_path])
        
        logger.info(f"File deleted from Supabase: {file_path}")
        return {'success': True, 'error': None}
        
    except Exception as e:
        error_msg = f"Supabase delete error: {str(e)}"
        logger.error(error_msg)
        return {'success': False, 'error': error_msg}
