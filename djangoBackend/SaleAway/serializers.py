from rest_framework import serializers
from .models import Listing

class ListingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Listing
        fields = ['id', 'name', 'description', 'price', 'list_date', 'last_edited_date']
        read_only_fields = ['id', 'list_date', 'last_edited_date']




