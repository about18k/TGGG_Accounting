from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Department
from .models import MaterialRequest


User = get_user_model()


class MaterialRequestWorkflowTests(APITestCase):
    def setUp(self):
        self.department = Department.objects.create(name='Project Operations')

        self.site_engineer = User.objects.create_user(
            username='engineer',
            email='engineer@example.com',
            password='testpass123',
            first_name='Site',
            last_name='Engineer',
            role='site_engineer',
            department=self.department,
            is_active=True,
        )
        self.site_coordinator = User.objects.create_user(
            username='coordinator',
            email='coordinator@example.com',
            password='testpass123',
            first_name='Site',
            last_name='Coordinator',
            role='site_coordinator',
            department=self.department,
            is_active=True,
        )
        self.studio_head = User.objects.create_user(
            username='studiohead',
            email='studiohead@example.com',
            password='testpass123',
            first_name='Studio',
            last_name='Head',
            role='studio_head',
            department=self.department,
            is_active=True,
        )
        self.ceo = User.objects.create_user(
            username='ceo',
            email='ceo@example.com',
            password='testpass123',
            first_name='Chief',
            last_name='Executive',
            role='ceo',
            department=self.department,
            is_active=True,
        )

        self.payload = {
            'project_name': 'Warehouse Expansion',
            'request_date': '2026-03-17',
            'required_date': '2026-03-24',
            'priority': 'high',
            'delivery_location': 'North Yard Storage',
            'notes': 'Needed before slab pour.',
            'items': [
                {
                    'name': 'Portland Cement',
                    'category': 'cement',
                    'quantity': '150.00',
                    'unit': 'bags',
                    'specifications': 'Type 1',
                    'sort_order': 0,
                },
                {
                    'name': 'Rebar 16mm',
                    'category': 'steel',
                    'quantity': '80.00',
                    'unit': 'pcs',
                    'specifications': 'Grade 60',
                    'sort_order': 1,
                },
            ],
        }

    def _create_and_submit_request(self, creator=None):
        creator_user = creator or self.site_engineer
        self.client.force_authenticate(creator_user)
        create_response = self.client.post('/api/material-requests/', self.payload, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        request_id = create_response.data['id']
        submit_response = self.client.post(f'/api/material-requests/{request_id}/submit/', {}, format='json')
        self.assertEqual(submit_response.status_code, status.HTTP_200_OK)

        return request_id

    def test_material_request_requires_studio_head_before_ceo(self):
        request_id = self._create_and_submit_request()

        self.client.force_authenticate(self.ceo)
        response = self.client.post(
            f'/api/material-requests/{request_id}/approval_action/',
            {'action': 'approve', 'comments': 'Skipping ahead'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_material_request_moves_from_studio_head_to_ceo_to_approved(self):
        request_id = self._create_and_submit_request()

        self.client.force_authenticate(self.studio_head)
        studio_head_response = self.client.post(
            f'/api/material-requests/{request_id}/approval_action/',
            {'action': 'approve', 'comments': 'Budget and quantities verified.'},
            format='json',
        )

        self.assertEqual(studio_head_response.status_code, status.HTTP_200_OK)

        material_request = MaterialRequest.objects.get(pk=request_id)
        self.assertEqual(material_request.status, 'pending_review')
        self.assertEqual(material_request.reviewed_by_studio_head, self.studio_head)
        self.assertEqual(material_request.studio_head_comments, 'Budget and quantities verified.')

        self.client.force_authenticate(self.ceo)
        ceo_response = self.client.post(
            f'/api/material-requests/{request_id}/approval_action/',
            {'action': 'approve', 'comments': 'Approved for procurement.'},
            format='json',
        )

        self.assertEqual(ceo_response.status_code, status.HTTP_200_OK)

        material_request.refresh_from_db()
        self.assertEqual(material_request.status, 'approved')
        self.assertEqual(material_request.reviewed_by_ceo, self.ceo)
        self.assertEqual(material_request.ceo_comments, 'Approved for procurement.')
        self.assertEqual(material_request.requester_role, 'site_engineer')

    def test_site_coordinator_can_create_and_submit_material_request(self):
        request_id = self._create_and_submit_request(creator=self.site_coordinator)

        material_request = MaterialRequest.objects.get(pk=request_id)
        self.assertEqual(material_request.created_by, self.site_coordinator)
        self.assertEqual(material_request.status, 'pending_review')
        self.assertEqual(material_request.requester_role, 'site_coordinator')

    def test_site_coordinator_does_not_see_site_engineer_requests(self):
        self._create_and_submit_request(creator=self.site_engineer)

        self.client.force_authenticate(self.site_coordinator)
        response = self.client.get('/api/material-requests/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_creator_can_edit_and_resubmit_after_studio_head_rejection(self):
        request_id = self._create_and_submit_request(creator=self.site_engineer)

        self.client.force_authenticate(self.studio_head)
        reject_response = self.client.post(
            f'/api/material-requests/{request_id}/approval_action/',
            {'action': 'reject', 'comments': 'Please adjust quantities and timing.'},
            format='json',
        )
        self.assertEqual(reject_response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.site_engineer)
        update_response = self.client.patch(
            f'/api/material-requests/{request_id}/',
            {
                'required_date': '2026-03-26',
                'notes': 'Updated quantities and delivery timing.',
                'items': [
                    {
                        'name': 'Portland Cement',
                        'category': 'cement',
                        'quantity': '120.00',
                        'unit': 'bags',
                        'specifications': 'Type 1',
                        'sort_order': 0,
                    }
                ],
            },
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)

        resubmit_response = self.client.post(
            f'/api/material-requests/{request_id}/submit/',
            {},
            format='json',
        )
        self.assertEqual(resubmit_response.status_code, status.HTTP_200_OK)

        material_request = MaterialRequest.objects.get(pk=request_id)
        self.assertEqual(material_request.status, 'pending_review')
        self.assertIsNone(material_request.reviewed_by_studio_head)
        self.assertEqual(material_request.studio_head_comments, '')

    def test_creator_cannot_edit_after_ceo_rejection(self):
        request_id = self._create_and_submit_request(creator=self.site_engineer)

        self.client.force_authenticate(self.studio_head)
        studio_head_approve = self.client.post(
            f'/api/material-requests/{request_id}/approval_action/',
            {'action': 'approve', 'comments': 'Forwarding to CEO.'},
            format='json',
        )
        self.assertEqual(studio_head_approve.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.ceo)
        ceo_reject = self.client.post(
            f'/api/material-requests/{request_id}/approval_action/',
            {'action': 'reject', 'comments': 'Budget deferred.'},
            format='json',
        )
        self.assertEqual(ceo_reject.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.site_engineer)
        update_response = self.client.patch(
            f'/api/material-requests/{request_id}/',
            {'notes': 'Attempting to revise final rejection.'},
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            update_response.data['error'],
            'Only draft or Studio Head-rejected material requests can be edited.',
        )

    def test_studio_head_rejected_material_request_is_hidden_from_ceo(self):
        request_id = self._create_and_submit_request(creator=self.site_engineer)

        self.client.force_authenticate(self.studio_head)
        reject_response = self.client.post(
            f'/api/material-requests/{request_id}/approval_action/',
            {'action': 'reject', 'comments': 'Please revise before escalation.'},
            format='json',
        )
        self.assertEqual(reject_response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.ceo)
        list_response = self.client.get('/api/material-requests/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 0)

        detail_response = self.client.get(f'/api/material-requests/{request_id}/')
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)
