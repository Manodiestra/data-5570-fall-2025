from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import Listing, Location
from .serializers import ListingSerializer, LocationSerializer

class ListingViewSet(viewsets.ModelViewSet):
    queryset = Listing.objects.all()
    serializer_class = ListingSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        return Listing.objects.all().order_by('-list_date')


class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        return Location.objects.all().order_by('-created_date')
