from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Department
from .models import BimDocumentation, BimDocumentationComment


User = get_user_model()


class BimDocumentationResubmissionTests(APITestCase):
    def setUp(self):
        self.department = Department.objects.create(name='Design Department')

        self.bim_specialist = User.objects.create_user(
            username='bimspecialist',
            email='bimspecialist@example.com',
            password='testpass123',
            role='bim_specialist',
            department=self.department,
            is_active=True,
        )
        self.junior_architect = User.objects.create_user(
            username='juniorarchitect',
            email='juniorarchitect@example.com',
            password='testpass123',
            role='junior_architect',
            department=self.department,
            is_active=True,
        )
        self.legacy_junior_designer = User.objects.create_user(
            username='legacyjuniordesigner',
            email='legacyjuniordesigner@example.com',
            password='testpass123',
            role='junior_designer',
            department=self.department,
            is_active=True,
        )
        self.studio_head = User.objects.create_user(
            username='studiohead',
            email='studiohead@example.com',
            password='testpass123',
            role='studio_head',
            department=self.department,
            is_active=True,
        )
        self.ceo = User.objects.create_user(
            username='ceo',
            email='ceo@example.com',
            password='testpass123',
            role='ceo',
            department=self.department,
            is_active=True,
        )

    def _create_and_submit_documentation(self, creator, title):
        self.client.force_authenticate(creator)

        create_response = self.client.post(
            '/api/bim-docs/',
            {
                'title': title,
                'description': 'Initial draft.',
                'doc_type': 'model-update',
                'doc_date': '2026-03-17',
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        doc_id = create_response.data['id']
        submit_response = self.client.post(f'/api/bim-docs/{doc_id}/submit/', {}, format='json')
        self.assertEqual(submit_response.status_code, status.HTTP_200_OK)

        return doc_id

    def _assert_creator_can_edit_and_resubmit_after_studio_head_rejection(self, creator, title):
        doc_id = self._create_and_submit_documentation(creator=creator, title=title)

        self.client.force_authenticate(self.studio_head)
        reject_response = self.client.post(
            f'/api/bim-docs/{doc_id}/approval_action/',
            {'action': 'reject', 'comments': 'Please revise the model notes.'},
            format='json',
        )
        self.assertEqual(reject_response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(creator)
        update_response = self.client.patch(
            f'/api/bim-docs/{doc_id}/',
            {
                'title': f'{title} (Revised)',
                'description': 'Updated details after Studio Head feedback.',
            },
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)

        resubmit_response = self.client.post(
            f'/api/bim-docs/{doc_id}/submit/',
            {},
            format='json',
        )
        self.assertEqual(resubmit_response.status_code, status.HTTP_200_OK)

        documentation = BimDocumentation.objects.get(pk=doc_id)
        self.assertEqual(documentation.status, 'pending_review')
        self.assertIsNone(documentation.reviewed_by_studio_head)
        self.assertEqual(documentation.studio_head_comments, '')

    def test_bim_specialist_can_edit_and_resubmit_after_studio_head_rejection(self):
        self._assert_creator_can_edit_and_resubmit_after_studio_head_rejection(
            creator=self.bim_specialist,
            title='BIM Specialist Submission',
        )

    def test_junior_architect_can_edit_and_resubmit_after_studio_head_rejection(self):
        self._assert_creator_can_edit_and_resubmit_after_studio_head_rejection(
            creator=self.junior_architect,
            title='Junior Architect Submission',
        )

    def test_creator_cannot_edit_after_ceo_rejection(self):
        doc_id = self._create_and_submit_documentation(
            creator=self.bim_specialist,
            title='Submission Rejected by CEO',
        )

        self.client.force_authenticate(self.studio_head)
        studio_head_approve = self.client.post(
            f'/api/bim-docs/{doc_id}/approval_action/',
            {'action': 'approve', 'comments': 'Forwarding to CEO.'},
            format='json',
        )
        self.assertEqual(studio_head_approve.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.ceo)
        ceo_reject = self.client.post(
            f'/api/bim-docs/{doc_id}/approval_action/',
            {'action': 'reject', 'comments': 'Rejected at final approval.'},
            format='json',
        )
        self.assertEqual(ceo_reject.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.bim_specialist)
        update_response = self.client.patch(
            f'/api/bim-docs/{doc_id}/',
            {'description': 'Attempting to revise after CEO decision.'},
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            update_response.data['error'],
            'Can only edit draft or Studio Head-rejected documentation',
        )

    def test_studio_head_rejected_documentation_is_hidden_from_ceo(self):
        doc_id = self._create_and_submit_documentation(
            creator=self.bim_specialist,
            title='Studio Head Rejected Submission',
        )

        self.client.force_authenticate(self.studio_head)
        reject_response = self.client.post(
            f'/api/bim-docs/{doc_id}/approval_action/',
            {'action': 'reject', 'comments': 'Not ready for CEO review.'},
            format='json',
        )
        self.assertEqual(reject_response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.ceo)
        list_response = self.client.get('/api/bim-docs/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 0)

        detail_response = self.client.get(f'/api/bim-docs/{doc_id}/')
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_bim_specialist_can_view_and_comment_on_junior_architect_fully_approved_docs(self):
        doc_id = self._create_and_submit_documentation(
            creator=self.junior_architect,
            title='Junior Architect Approved Design',
        )

        self.client.force_authenticate(self.studio_head)
        studio_head_approve = self.client.post(
            f'/api/bim-docs/{doc_id}/approval_action/',
            {'action': 'approve', 'comments': 'Forwarding to CEO.'},
            format='json',
        )
        self.assertEqual(studio_head_approve.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.ceo)
        ceo_approve = self.client.post(
            f'/api/bim-docs/{doc_id}/approval_action/',
            {'action': 'approve', 'comments': 'Final approval granted.'},
            format='json',
        )
        self.assertEqual(ceo_approve.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.bim_specialist)
        list_response = self.client.get('/api/bim-docs/?created_by_role=junior_architect')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]['id'], doc_id)

        comment_response = self.client.post(
            f'/api/bim-docs/{doc_id}/comments/',
            {'content': 'Great approved layout. I will align BIM details.'},
            format='json',
        )
        self.assertEqual(comment_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(comment_response.data['content'], 'Great approved layout. I will align BIM details.')

        saved_comment = BimDocumentationComment.objects.filter(documentation_id=doc_id).latest('id')
        self.assertEqual(saved_comment.author, self.bim_specialist)

    def test_bim_specialist_cannot_view_or_comment_on_junior_architect_not_fully_approved_docs(self):
        doc_id = self._create_and_submit_documentation(
            creator=self.junior_architect,
            title='Junior Architect Pending CEO Approval',
        )

        self.client.force_authenticate(self.studio_head)
        studio_head_approve = self.client.post(
            f'/api/bim-docs/{doc_id}/approval_action/',
            {'action': 'approve', 'comments': 'Forwarding to CEO.'},
            format='json',
        )
        self.assertEqual(studio_head_approve.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.bim_specialist)
        list_response = self.client.get('/api/bim-docs/?created_by_role=junior_architect')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 0)

        comment_response = self.client.post(
            f'/api/bim-docs/{doc_id}/comments/',
            {'content': 'Trying to comment before final approval.'},
            format='json',
        )
        self.assertEqual(comment_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_bim_specialist_can_view_legacy_junior_designer_fully_approved_docs(self):
        doc_id = self._create_and_submit_documentation(
            creator=self.legacy_junior_designer,
            title='Legacy Junior Designer Approved Design',
        )

        self.client.force_authenticate(self.studio_head)
        studio_head_approve = self.client.post(
            f'/api/bim-docs/{doc_id}/approval_action/',
            {'action': 'approve', 'comments': 'Forwarding to CEO.'},
            format='json',
        )
        self.assertEqual(studio_head_approve.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.ceo)
        ceo_approve = self.client.post(
            f'/api/bim-docs/{doc_id}/approval_action/',
            {'action': 'approve', 'comments': 'Final approval granted.'},
            format='json',
        )
        self.assertEqual(ceo_approve.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.bim_specialist)
        list_response = self.client.get('/api/bim-docs/?created_by_role=junior_architect')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        response_ids = [item['id'] for item in list_response.data]
        self.assertIn(doc_id, response_ids)
