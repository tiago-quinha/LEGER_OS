from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Expense

class WebhookTests(APITestCase):
    def test_webhook_santander_success(self):
        url = reverse('webhook')
        data = {
            "title": "Notification",
            "text": "Compra de 12,50€ em PINGO DOCE",
            "package_name": "com.santander.app"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Expense.objects.count(), 1)
        expense = Expense.objects.first()
        self.assertEqual(expense.amount, 12.50)
        self.assertEqual(expense.merchant, "PINGO DOCE")
        self.assertEqual(expense.source, "Santander")

    def test_webhook_mbway_success(self):
        url = reverse('webhook')
        data = {
            "title": "Notification",
            "text": "Pagamento de 10.00 EUR a MBWAY-USER",
            "package_name": "pt.sibs.android.mbway"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Expense.objects.count(), 1)
        expense = Expense.objects.first()
        self.assertEqual(expense.amount, 10.00)
        self.assertEqual(expense.merchant, "MBWAY-USER")
        self.assertEqual(expense.source, "MB WAY")

    def test_webhook_unknown_source(self):
        url = reverse('webhook')
        data = {
            "title": "Notification",
            "text": "Compra de 12,50€ em PINGO DOCE",
            "package_name": "com.unknown.app"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], "Unknown source")

    def test_webhook_invalid_text(self):
        url = reverse('webhook')
        data = {
            "title": "Notification",
            "text": "Invalid text here",
            "package_name": "com.santander.app"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], "Could not parse notification text")
