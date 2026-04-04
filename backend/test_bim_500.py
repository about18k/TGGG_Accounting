import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from bim_documentation.models import BimDocumentation

User = get_user_model()

def test_retrieve():
    client = APIClient()
    # Try to find a user with architect role or create one
    user = User.objects.filter(role__in=['junior_architect', 'junior_designer']).first()
    if not user:
        user = User.objects.create_user(username='testarch', email='testarch@example.com', password='password', role='junior_architect')
    
    client.force_authenticate(user=user)
    
    # Try to fetch documentation list
    print("Testing GET /api/bim-docs/")
    try:
        response = client.get('/api/bim-docs/')
        print(f"Status: {response.status_code}")
        if response.status_code >= 500:
            print(f"Error Response: {response.content.decode()}")
    except Exception as e:
        print(f"Fetch list failed: {str(e)}")
    
    # Try to fetch a specific ID (if exists)
    doc = BimDocumentation.objects.first()
    if doc:
        print(f"\nTesting GET /api/bim-docs/{doc.id}/")
        try:
            response = client.get(f'/api/bim-docs/{doc.id}/')
            print(f"Status: {response.status_code}")
            if response.status_code >= 500:
                print(f"Error Response: {response.content.decode()}")
        except Exception as e:
            print(f"Fetch detail failed: {str(e)}")
    else:
        print("\nNo documentation found to test detail view.")

if __name__ == "__main__":
    test_retrieve()
