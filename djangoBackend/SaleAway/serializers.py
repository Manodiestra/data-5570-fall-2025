from rest_framework import serializers
from .models import Listing, Location

class ListingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Listing
        fields = ['id', 'name', 'description', 'price', 'image_url', 'list_date', 'last_edited_date']
        read_only_fields = ['id', 'list_date', 'last_edited_date']


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['id', 'name', 'address', 'city', 'state', 'zip', 'created_date', 'updated_date']
        read_only_fields = ['id', 'created_date', 'updated_date']




