from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from vulnsphere.models import User, Company, Asset, Project

class ReportingAPITests(APITestCase):
    def setUp(self):
        # Users with new role system
        self.admin_user = User.objects.create_user(
            email='admin@test.com', 
            password='password',
            username='admin',
            name='Admin User',
            role='ADMIN'
        )
        self.tester = User.objects.create_user(
            email='tester@test.com', 
            password='password',
            username='tester1',
            name='Tester One',
            role='TESTER'
        )
        self.client_user = User.objects.create_user(
            email='client@test.com', 
            password='password',
            username='client1',
            name='Client One',
            role='CLIENT'
        )

        # Companies - all users can access all companies (global roles)
        self.company = Company.objects.create(name='Company A', contact_email='a@test.com')
        self.company_other = Company.objects.create(name='Company B', contact_email='b@test.com')

        # Data
        self.asset = Asset.objects.create(company=self.company, name='WebApp', type='WEB_APP', identifier='https://example.com')
        self.project = Project.objects.create(
            company=self.company, 
            title='Pentest Q1', 
            engagement_type='WEB_APP', 
            start_date='2024-01-01', 
            end_date='2024-01-05',
            created_by=self.tester,
            last_edited_by=self.tester
        )

    def test_tester_can_create_asset(self):
        self.client.force_authenticate(user=self.tester)
        url = reverse('company-assets-list', kwargs={'company_pk': self.company.pk})
        data = {
            'name': 'API Server',
            'type': 'API',
            'identifier': 'api.example.com'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Asset.objects.count(), 2)
        self.assertEqual(Asset.objects.last().company, self.company)

    def test_client_cannot_create_asset(self):
        self.client.force_authenticate(user=self.client_user)
        url = reverse('company-assets-list', kwargs={'company_pk': self.company.pk})
        data = {'name': 'Hack', 'type': 'WEB_APP', 'identifier': 'hacked'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_tester_can_access_any_company_assets(self):
        self.client.force_authenticate(user=self.tester)
        # Testers can access any company now (global roles)
        url = reverse('company-assets-list', kwargs={'company_pk': self.company_other.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_project_listing(self):
        self.client.force_authenticate(user=self.tester)
        url = reverse('company-projects-list', kwargs={'company_pk': self.company.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see the one project we created
