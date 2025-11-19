from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework import status
from .models import Listing, Location
from .serializers import ListingSerializer, LocationSerializer
from .authentication import CognitoJWTAuthentication
from .s3_utils import generate_presigned_url

class ListingViewSet(viewsets.ModelViewSet):
    queryset = Listing.objects.all()
    serializer_class = ListingSerializer
    authentication_classes = [CognitoJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """
        Allow unauthenticated users to GET (list/retrieve) listings,
        but require authentication for POST, PUT, PATCH, DELETE.
        """
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        return Listing.objects.all().order_by('-list_date')


class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    authentication_classes = [CognitoJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Location.objects.all().order_by('-created_date')


@api_view(['POST'])
@authentication_classes([CognitoJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_presigned_url(request):
    """
    Generate a presigned URL for uploading an image to S3
    Requires authentication.
    
    Expected POST body:
    {
        "file_name": "image.jpg",
        "content_type": "image/jpeg"
    }
    """
    try:
        file_name = request.data.get('file_name', 'image.jpg')
        content_type = request.data.get('content_type', 'image/jpeg')
        
        if not file_name or not content_type:
            return Response(
                {'error': 'file_name and content_type are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result = generate_presigned_url(file_name, content_type)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
