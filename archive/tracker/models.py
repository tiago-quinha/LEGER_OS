from django.db import models

class Expense(models.Model):
    SOURCE_CHOICES = [
        ('Santander', 'Santander'),
        ('MB WAY', 'MB WAY'),
    ]

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    merchant = models.CharField(max_length=255)
    date = models.DateTimeField(auto_now_add=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    raw_text = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.amount} at {self.merchant} via {self.source}"
