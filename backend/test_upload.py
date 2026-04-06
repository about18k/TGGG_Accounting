import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from bim_documentation.supabase_storage import get_supabase_client, SUPABASE_BUCKET
from io import BytesIO

def test_upload():
    try:
        client = get_supabase_client()
        print(f"Testing upload to bucket: {SUPABASE_BUCKET}")
        
        # Create a dummy file
        file_content = b"test content"
        file_path = "test/test_connection.txt"
        
        print(f"Uploading {file_path}...")
        response = client.storage.from_(SUPABASE_BUCKET).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": "text/plain"}
        )
        print("Upload successful!")
        print(response)
        
        # Clean up
        client.storage.from_(SUPABASE_BUCKET).remove([file_path])
        print("Cleanup successful!")
        
    except Exception as e:
        print(f"Upload failed: {str(e)}")
        if hasattr(e, 'response'):
            print(f"Response status: {e.response.status_code}")
            print(f"Response body: {e.response.text}")

if __name__ == "__main__":
    test_upload()
