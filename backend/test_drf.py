import sys
import traceback
from django.contrib.auth import get_user_model
from material_requests.serializers import MaterialRequestSerializer
from rest_framework.test import APIRequestFactory

User = get_user_model()
try:
    user = User.objects.first()
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

    factory = APIRequestFactory()
    request = factory.post('/api/material-requests/', data, format='json')
    request.user = user
    # DRF request override
    from rest_framework.request import Request
    from rest_framework.parsers import JSONParser
    drf_request = Request(request, parsers=[JSONParser()])
    drf_request.user = user
    
    serializer = MaterialRequestSerializer(data=data, context={'request': drf_request})
    if serializer.is_valid():
        print("Valid!")
        instance = serializer.save()
        print(f"Created instance: {instance.id}")
    else:
        print("Invalid data:", serializer.errors)
except Exception as e:
    print("Exception!")
    traceback.print_exc()
