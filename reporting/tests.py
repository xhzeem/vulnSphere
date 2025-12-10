from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from core.models import User, Company, CompanyMembership
from reporting.models import Asset, Report

class ReportingAPITests(APITestCase):
    def setUp(self):
        # Users
        self.tester = User.objects.create_user(email='tester@test.com', password='password')
        self.client_user = User.objects.create_user(email='client@test.com', password='password')
        self.other_tester = User.objects.create_user(email='other@test.com', password='password')

        # Company
        self.company = Company.objects.create(name='Company A', slug='company-a', contact_email='a@test.com')
        self.company_other = Company.objects.create(name='Company B', slug='company-b', contact_email='b@test.com')

        # Memberships
        CompanyMembership.objects.create(user=self.tester, company=self.company, role='TESTER')
        CompanyMembership.objects.create(user=self.client_user, company=self.company, role='CLIENT')
        CompanyMembership.objects.create(user=self.other_tester, company=self.company_other, role='TESTER')

        # Data
        self.asset = Asset.objects.create(company=self.company, name='WebApp', type='WEB_APP', identifier='https://example.com')
        self.report = Report.objects.create(company=self.company, title='Pentest Q1', engagement_type='WEB_APP', start_date='2024-01-01', end_date='2024-01-05')

    def test_tester_can_create_asset(self):
        self.client.force_authenticate(user=self.tester)
        # Using nested route: /api/v1/companies/{id}/assets/
        url = reverse('company-assets-list', kwargs={'company_pk': self.company.pk})
        data = {
            'name': 'API Server',
            'type': 'API',
            'identifier': 'api.example.com',
            'environment': 'PRODUCTION'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Asset.objects.count(), 2)
        self.assertEqual(Asset.objects.last().company, self.company)

    def test_client_cannot_create_asset(self):
        self.client.force_authenticate(user=self.client_user)
        url = reverse('company-assets-list', kwargs={'company_pk': self.company.pk})
        data = {'name': 'Hack', 'type': 'WEB_APP', 'identifier': 'hacked', 'environment': 'TEST'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_tester_cannot_access_other_company_assets(self):
        self.client.force_authenticate(user=self.tester)
        # Try to list assets of Company B
        url = reverse('company-assets-list', kwargs={'company_pk': self.company_other.pk})
        response = self.client.get(url)
        # Should return 404 or empty list depending on impl. Given IsCompanyMember checks URL, it should be 403 Forbidden because membership check fails.
        # Check IsCompanyMember implementation:
        # if not member -> return False -> 403 Forbidden.
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_report_listing_filtered(self):
        self.client.force_authenticate(user=self.tester)
        url = reverse('company-reports-list', kwargs={'company_pk': self.company.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
