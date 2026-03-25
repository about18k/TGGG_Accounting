import sys
import traceback
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()
try:
    user = User.objects.filter(role='site_engineer').first()

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
                "price": "NaN",
                "discount": 0.00,
                "total": "NaN",
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
