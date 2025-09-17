from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import Listing
from .serializers import ListingSerializer

class ListingViewSet(viewsets.ModelViewSet):
    queryset = Listing.objects.all()
    serializer_class = ListingSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        return Listing.objects.all().order_by('-list_date')
