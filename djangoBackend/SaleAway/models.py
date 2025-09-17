from django.db import models
from django.utils import timezone

# Create your models here.

class Listing(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    list_date = models.DateTimeField(default=timezone.now)
    last_edited_date = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-list_date']
    
    def __str__(self):
        return self.name
