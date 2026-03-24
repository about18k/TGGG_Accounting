import io
from django.core.files.uploadedfile import SimpleUploadedFile
from accounts.models import CustomUser
from rest_framework.test import APIRequestFactory, force_authenticate
from material_requests.views import MaterialRequestViewSet

user = CustomUser.objects.filter(role='site_engineer').first()
if not user:
    print("NO USER FOUND")
else:
    dummy_file = SimpleUploadedFile("test_image.jpg", b"file_content_here", content_type="image/jpeg")

    factory = APIRequestFactory()
    request = factory.post('/api/material-requests/', {
        'project_name': 'Test Project',
        'request_date': '2026-03-24',
        'required_date': '2026-03-25',
        'priority': 'normal',
        'delivery_location': 'Here',
        'request_image': dummy_file
    }, format='multipart')
    
    force_authenticate(request, user=user)

    try:
        view = MaterialRequestViewSet.as_view({'post': 'create'})
        response = view(request)
        print("STATUS:", response.status_code)
        if hasattr(response, 'data'):
            print("DATA:", response.data)
        else:
            print("NO DATA")
    except Exception as e:
        import traceback
        traceback.print_exc()
