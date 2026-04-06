import os
from decouple import config

def check_supabase():
    url = config('SUPABASE_URL', default='NOT SET')
    key = config('SUPABASE_KEY', default='NOT SET')
    role_key = config('SUPABASE_SERVICE_ROLE_KEY', default='NOT SET')
    bucket = config('SUPABASE_STORAGE_BUCKET', default='bim-docs')
    
    print(f"URL: {url}")
    print(f"Key: {'SET' if key != 'NOT SET' else 'NOT SET'}")
    print(f"Role Key: {'SET' if role_key != 'NOT SET' else 'NOT SET'}")
    print(f"Bucket: {bucket}")

if __name__ == "__main__":
    check_supabase()
