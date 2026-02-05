from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
from .models import CustomUser, Department
from .serializers import CustomUserSerializer, PendingUserSerializer

# Create your views here.

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
        if user.check_password(password) and user.is_active:
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
                    'permissions': user.permissions or []
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Invalid credentials or inactive account'
            }, status=status.HTTP_401_UNAUTHORIZED)
    except CustomUser.DoesNotExist:
        return Response({
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """Register endpoint"""
    email = request.data.get('email')
    password = request.data.get('password')
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    department_id = request.data.get('department_id')
    
    if not email or not password:
        return Response({
            'error': 'Email and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if CustomUser.objects.filter(email=email).exists():
        return Response({
            'error': 'Email already registered'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        department = Department.objects.get(id=department_id) if department_id else None
        user = CustomUser.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            username=email.split('@')[0],
            department=department,
            is_active=False
        )
        
        return Response({
            'success': True,
            'message': 'Registration submitted. Your account will be verified by an admin.',
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'department': user.department.id if user.department else None,
                'department_name': user.department.name if user.department else None,
            }
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


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
        'permissions': user.permissions or []
    })


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


def _is_admin_user(user):
    return user.is_staff or user.is_superuser or user.role in ['admin', 'manager', 'supervisor']


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_users(request):
    if not _is_admin_user(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    users = CustomUser.objects.filter(is_active=False).order_by('-created_at')
    return Response(PendingUserSerializer(users, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_user(request):
    if not _is_admin_user(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    user_id = request.data.get('user_id')
    department_id = request.data.get('department_id')
    role = request.data.get('role')
    permissions = request.data.get('permissions', [])

    if not user_id or not department_id or not role:
        return Response({'error': 'user_id, department_id, and role are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = CustomUser.objects.get(id=user_id)
        department = Department.objects.get(id=department_id)
    except CustomUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
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
- Department: {department.name}
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
            'department': user.department.id,
            'department_name': user.department.name,
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
    if not _is_admin_user(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    users = CustomUser.objects.all().order_by('last_name', 'first_name', 'email')
    return Response(CustomUserSerializer(users, many=True).data)
