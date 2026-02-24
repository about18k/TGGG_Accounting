from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from .models import CustomUser, Department
from .serializers import CustomUserSerializer, PendingUserSerializer
import uuid
from supabase import create_client, Client

# Create your views here.

ALLOWED_ROLES = [
    'accounting', 'employee', 'bim_specialist', 'intern', 'junior_architect',
    'president', 'site_engineer', 'site_coordinator', 'studio_head', 'admin'
]

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Login endpoint - returns JWT token and user info"""
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({
            'error': 'Email and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = CustomUser.objects.get(email=email)
        if user.check_password(password):
            if not user.is_active:
                return Response({'error': 'Account not yet approved by Studio Head/Admin.'}, status=status.HTTP_403_FORBIDDEN)
            # Only allow login for users with the allowed roles
            if user.role not in ALLOWED_ROLES:
                return Response({'error': 'Your role is not permitted to login.'}, status=status.HTTP_403_FORBIDDEN)
            refresh = RefreshToken.for_user(user)
            return Response({
                'success': True,
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'employee_id': user.employee_id,
                    'department': user.department.id if user.department else None,
                    'department_name': user.department.name if user.department else None,
                    'role': user.role if user.role else None,
                    'role_name': user.get_role_display() if user.role else None,
                    'permissions': user.permissions or [],
                    'profile_picture': user.profile_picture or None
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """Register endpoint"""
    email = request.data.get('email')
    password = request.data.get('password')
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    # Remove department and role assignment at registration
    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)
    if CustomUser.objects.filter(email=email).exists():
        return Response({'error': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = CustomUser.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            username=email.split('@')[0],
            is_active=False  # Always inactive until approved by studio head/admin
        )
        return Response({
            'success': True,
            'message': 'Registration submitted. Your account will be verified by a Studio Head or Admin.',
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get current user profile"""
    user = request.user
    return Response({
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'employee_id': user.employee_id,
        'phone_number': user.phone_number,
        'department': user.department.id if user.department else None,
        'department_name': user.department.name if user.department else None,
        'role': user.role if user.role else None,
        'role_name': user.get_role_display() if user.role else None,
        'profile_picture': user.profile_picture,
        'permissions': user.permissions or []
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_picture(request):
    """Upload user profile picture to Supabase Storage."""
    user = request.user
    profile_pic = request.FILES.get('profile_pic')

    if not profile_pic:
        return Response({'error': 'No image provided.'}, status=status.HTTP_400_BAD_REQUEST)

    # Initialize Supabase client
    supabase_url = getattr(settings, 'SUPABASE_URL', None)
    supabase_key = getattr(settings, 'SUPABASE_KEY', None)

    if not supabase_url or not supabase_key:
        return Response({'error': 'Supabase configuration is missing in the backend.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Generate unique filename
        file_extension = profile_pic.name.split('.')[-1]
        file_path = f"{user.id}/avatar_{uuid.uuid4().hex}.{file_extension}"

        # Upload to Supabase Storage bucket 'profile_picture'
        # read the file content
        file_content = profile_pic.read()
        res = supabase.storage.from_('profile_picture').upload(
            file=file_content,
            path=file_path,
            file_options={'content-type': profile_pic.content_type, 'upsert': 'true'}
        )

        # Get the public URL
        public_url = supabase.storage.from_('profile_picture').get_public_url(file_path)

        # Remove the previous picture from storage if it exists to save space
        if user.profile_picture and "supabase.co/storage/v1/object/public/profile_picture/" in user.profile_picture:
            try:
                old_path = user.profile_picture.split("profile_picture/")[-1]
                supabase.storage.from_('profile_picture').remove([old_path])
            except Exception as e:
                print(f"Failed to delete old profile picture: {e}")

        # Update user profile
        user.profile_picture = public_url
        user.save()

        return Response({
            'success': True,
            'message': 'Profile picture updated successfully.',
            'profile_picture': public_url
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_departments(request):
    """Get all departments"""
    departments = Department.objects.all()
    return Response([
        {
            'id': dept.id,
            'name': dept.name,
            'description': dept.description
        }
        for dept in departments
    ])


def _is_studio_head_or_admin(user):
    # Only studio head or admin can approve/see users
    return user.is_staff or user.is_superuser or user.role in ['studio_head', 'admin']


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_users(request):
    if not _is_studio_head_or_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    users = CustomUser.objects.filter(is_active=False).order_by('-created_at')
    return Response(PendingUserSerializer(users, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_user(request):
    if not _is_studio_head_or_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    user_id = request.data.get('user_id')
    role = request.data.get('role')
    permissions = request.data.get('permissions', [])
    department_id = request.data.get('department_id')  # Optional

    if not user_id or not role or role not in ALLOWED_ROLES:
        return Response({'error': 'user_id and valid role are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = CustomUser.objects.get(id=user_id)
    except CustomUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    department = None
    if department_id:
        try:
            department = Department.objects.get(id=department_id)
        except Department.DoesNotExist:
            return Response({'error': 'Department not found'}, status=status.HTTP_404_NOT_FOUND)
    user.department = department
    user.role = role
    user.permissions = permissions
    user.is_active = True
    user.save()

    email_sent = False
    try:
        email_message = f"""
Hello {user.first_name} {user.last_name},

Your account has been successfully verified and approved!

Account Details:
- Email: {user.email}
- Department: {user.department.name if user.department else 'N/A'}
- Role: {user.get_role_display()}

You can now log in to the Triple G using your email and password.

If you have any questions, please contact your administrator.

Best regards,
Triple G Admin
        """.strip()
        send_mail(
            subject='Your Account Has Been Verified - Triple G',
            message=email_message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
            recipient_list=[user.email],
            fail_silently=False,
        )
        email_sent = True
    except Exception as e:
        email_sent = False
        print(f"Email sending failed: {str(e)}")

    return Response({
        'success': True,
        'email_sent': email_sent,
        'user': {
            'id': user.id,
            'email': user.email,
            'department': user.department.id if user.department else None,
            'department_name': user.department.name if user.department else None,
            'role': user.role,
        }
    })


@api_view(['GET'])
def accounts_overview(request):
    """Overview of accounts module"""
    return Response({
        'message': 'Accounts module',
        'features': ['Chart of Accounts', 'Journal Entries', 'General Ledger', 'Financial Reports']
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    if not _is_studio_head_or_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    users = CustomUser.objects.all().order_by('last_name', 'first_name', 'email')
    return Response(CustomUserSerializer(users, many=True).data)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_user(request, user_id):
    if not _is_studio_head_or_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = CustomUser.objects.get(id=user_id)
    except CustomUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        if request.user.id == user.id:
            return Response({'error': 'You cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response({'success': True})

    # PATCH update
    fields_updated = []
    first_name = request.data.get('first_name')
    last_name = request.data.get('last_name')
    role = request.data.get('role')
    department_id = request.data.get('department_id') if 'department_id' in request.data else None
    is_active = request.data.get('is_active') if 'is_active' in request.data else None

    if first_name is not None:
        user.first_name = str(first_name).strip()
        fields_updated.append('first_name')

    if last_name is not None:
        user.last_name = str(last_name).strip()
        fields_updated.append('last_name')

    if role is not None:
        if role not in ALLOWED_ROLES:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)
        user.role = role
        fields_updated.append('role')

    if 'department_id' in request.data:
        if department_id in [None, '', 'null', 'None']:
            user.department = None
        else:
            try:
                user.department = Department.objects.get(id=department_id)
            except Department.DoesNotExist:
                return Response({'error': 'Department not found'}, status=status.HTTP_404_NOT_FOUND)
        fields_updated.append('department')

    if is_active is not None:
        normalized = is_active
        if isinstance(is_active, str):
            normalized = is_active.lower() in ['1', 'true', 'yes', 'on']
        else:
            normalized = bool(is_active)

        if request.user.id == user.id and normalized is False:
            return Response({'error': 'You cannot suspend your own account.'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = normalized
        fields_updated.append('is_active')

    if not fields_updated:
        return Response({'error': 'No valid fields to update'}, status=status.HTTP_400_BAD_REQUEST)

    user.save()
    return Response({
        'success': True,
        'user': CustomUserSerializer(user).data,
    })
