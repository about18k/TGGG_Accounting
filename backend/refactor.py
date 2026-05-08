import re

with open('accounts/views.py', 'r') as f:
    code = f.read()

# Replace supabase import
code = re.sub(r'from supabase import create_client, Client\n', 'import boto3\n', code)

def repl_upload_pic(match):
    return '''@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_picture(request):
    """Upload user profile picture to MinIO Storage."""
    user = request.user
    profile_pic = request.FILES.get('profile_pic')

    if not profile_pic:
        return Response({'error': 'No image provided.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        
        file_extension = profile_pic.name.split('.')[-1]
        file_path = f"{user.id}/avatar_{uuid.uuid4().hex}.{file_extension}"

        s3.upload_fileobj(
            profile_pic,
            'profile-picture',
            file_path,
            ExtraArgs={'ContentType': profile_pic.content_type, 'ACL': 'public-read'}
        )

        public_url = f"{settings.AWS_S3_ENDPOINT_URL}/profile-picture/{file_path}"

        if user.profile_picture and "/profile-picture/" in user.profile_picture:
            try:
                old_path = user.profile_picture.split("profile-picture/")[-1]
                s3.delete_object(Bucket='profile-picture', Key=old_path)
            except Exception as e:
                print(f"Failed to delete old profile picture: {e}")

        user.profile_picture = public_url
        user.save()

        return Response({
            'success': True,
            'message': 'Profile picture updated successfully.',
            'profile-picture': public_url
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)'''

code = re.sub(r'@api_view\(\[\'POST\'\]\)\n@permission_classes\(\[IsAuthenticated\]\)\ndef upload_profile_picture\(request\):.*?return Response\(\{\'error\': str\(e\)\}, status=status\.HTTP_500_INTERNAL_SERVER_ERROR\)', repl_upload_pic, code, flags=re.DOTALL)

def repl_upload_sig(match):
    return '''@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_signature(request):
    """Upload user signature image to MinIO Storage."""
    user = request.user
    signature_file = request.FILES.get('signature') or request.FILES.get('signature_file')

    if not signature_file:
        return Response({'error': 'No signature image provided.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )

        file_extension = signature_file.name.split('.')[-1]
        file_path = f"{user.id}/signature_{uuid.uuid4().hex}.{file_extension}"

        s3.upload_fileobj(
            signature_file,
            'user-signature',
            file_path,
            ExtraArgs={'ContentType': signature_file.content_type, 'ACL': 'public-read'}
        )

        public_url = f"{settings.AWS_S3_ENDPOINT_URL}/user-signature/{file_path}"

        if user.signature_image:
            try:
                if "/user-signature/" in user.signature_image:
                    old_path = user.signature_image.split("user-signature/")[-1]
                    s3.delete_object(Bucket='user-signature', Key=old_path)
                elif "/profile-picture/" in user.signature_image:
                    old_path = user.signature_image.split("profile-picture/")[-1]
                    s3.delete_object(Bucket='profile-picture', Key=old_path)
            except Exception as e:
                print(f"Failed to delete old signature: {e}")

        user.signature_image = public_url
        user.save()

        return Response({
            'success': True,
            'message': 'Signature updated successfully.',
            'signature_image': public_url
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)'''

code = re.sub(r'@api_view\(\[\'POST\'\]\)\n@permission_classes\(\[IsAuthenticated\]\)\ndef upload_profile_signature\(request\):.*?return Response\(\{\'error\': str\(e\)\}, status=status\.HTTP_500_INTERNAL_SERVER_ERROR\)', repl_upload_sig, code, flags=re.DOTALL)

with open('accounts/views.py', 'w') as f:
    f.write(code)
