import re

with open('material_requests/views.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace supabase import
code = re.sub(r'from supabase import create_client, Client\n', 'import boto3\n', code)

def repl_upload_matreq(match):
    return '''def upload_matreq_img_to_supabase(file_obj, user_id):
    try:
        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        file_extension = file_obj.name.split('.')[-1]
        import uuid
        file_path = f"{user_id}/matreq_{uuid.uuid4().hex}.{file_extension}"
        
        s3.upload_fileobj(
            file_obj,
            'matrequest-img',
            file_path,
            ExtraArgs={'ContentType': file_obj.content_type, 'ACL': 'public-read'}
        )
        
        return f"{settings.AWS_S3_ENDPOINT_URL}/matrequest-img/{file_path}"
    except Exception as e:
        raise Exception(f"Failed to upload image to S3: {str(e)}")

def remove_matreq_img_from_supabase(public_url):
    if not public_url or "/matrequest-img/" not in public_url:
        return
        
    try:
        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        old_path = public_url.split("matrequest-img/")[-1]
        s3.delete_object(Bucket='matrequest-img', Key=old_path)
    except Exception as e:
        print(f"Failed to delete old material request image: {e}")

def upload_accounting_receipt_to_supabase(file_obj, user_id):
    try:
        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        file_extension = file_obj.name.split('.')[-1]
        import uuid
        file_path = f"{user_id}/receipt_{uuid.uuid4().hex}.{file_extension}"
        
        s3.upload_fileobj(
            file_obj,
            'accounting-receipt',
            file_path,
            ExtraArgs={'ContentType': file_obj.content_type, 'ACL': 'public-read'}
        )
        
        return f"{settings.AWS_S3_ENDPOINT_URL}/accounting-receipt/{file_path}"
    except Exception as e:
        raise Exception(f"Failed to upload receipt to S3: {str(e)}")'''

old_func_pattern = r'def upload_matreq_img_to_supabase\(file_obj, user_id\):.*?return public_url'
code = re.sub(old_func_pattern, repl_upload_matreq, code, flags=re.DOTALL)

with open('material_requests/views.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Refactored material_requests/views.py")
