import sys
import traceback
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()
try:
    user = User.objects.filter(role='site_engineer').first()
    if not user:
        user = User.objects.filter(role='site_coordinator').first()
    if not user:
        print("No engineer/coordinator found")
        sys.exit(1)

    data = {
        "project_name": "Test Project",
        "request_date": "2026-03-25",
        "required_date": "2026-03-26",
        "priority": "normal",
        "delivery_location": "Site A",
        "notes": "Test notes",
        "items": [
            {
                "name": "Cement",
                "category": "cement",
                "quantity": 10,
                "unit": "bags",
                "price": 0,
                "discount": 0.00,
                "total": 0,
                "specifications": "Portland",
                "sort_order": 0
            }
        ]
    }

    client = APIClient(raise_request_exception=False, SERVER_NAME='localhost')
    client.force_authenticate(user=user)
    
    # Send JSON
    response = client.post('/api/material-requests/', data=data, format='json', HTTP_HOST='localhost')
    print(f"Status: {response.status_code}")
    if response.status_code != 201:
        print(response.content.decode('utf-8')[:1000])

except Exception as e:
    print("Exception occurred during request:")
    traceback.print_exc()
