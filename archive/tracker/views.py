from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services import parse_notification
from .models import Expense

class WebhookView(APIView):
    def post(self, request):
        data = request.data
        title = data.get('title', '')
        text = data.get('text', '')
        package_name = data.get('package_name', '').lower()

        # Extract source based on package_name
        source = None
        if 'santander' in package_name:
            source = 'Santander'
        elif 'mbway' in package_name:
            source = 'MB WAY'
        
        if not source:
            return Response({"error": "Unknown source"}, status=status.HTTP_400_BAD_REQUEST)

        parsed_data = parse_notification(text)
        if not parsed_data:
            return Response({"error": "Could not parse notification text"}, status=status.HTTP_400_BAD_REQUEST)

        expense = Expense.objects.create(
            amount=parsed_data['amount'],
            merchant=parsed_data['merchant'],
            source=source
        )

        return Response({
            "id": expense.id,
            "amount": str(expense.amount),
            "merchant": expense.merchant,
            "source": expense.source,
            "date": expense.date
        }, status=status.HTTP_201_CREATED)
