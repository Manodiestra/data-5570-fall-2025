from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework import status
from .models import Listing, Location
from .serializers import ListingSerializer, LocationSerializer
from .authentication import CognitoJWTAuthentication
from .s3_utils import generate_presigned_url, upload_image_data
import os
import base64
import random
from openai import OpenAI

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


@api_view(['GET'])
@authentication_classes([CognitoJWTAuthentication])
@permission_classes([IsAuthenticated])
def generate_random_listing(request):
    """
    Generate a random listing using OpenAI's API
    Requires authentication.
    
    Returns a JSON object with generated listing data:
    {
        "name": "...",
        "description": "...",
        "price": 123.45,
        "image_url": "..."
    }
    """
    try:
        # Get OpenAI API key from environment
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return Response(
                {'error': 'OPENAI_API_KEY not configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        client = OpenAI(api_key=api_key)
        
        # Generate item name
        name_response = client.responses.create(
            model="gpt-5-nano",
            input="Generate a creative, catchy name for a random item that could be sold on a marketplace (like a garage sale item). Return only the name, nothing else."
        )
        name = ""
        # Try output_text property first (if available)
        if hasattr(name_response, 'output_text') and name_response.output_text:
            name = name_response.output_text.strip()
        # Otherwise parse the output structure
        elif name_response.output and len(name_response.output) > 0:
            for output in name_response.output:
                if hasattr(output, 'content') and output.content:
                    for content_item in output.content:
                        if hasattr(content_item, 'text'):
                            name = content_item.text.strip()
                            break
                    if name:
                        break
        
        if not name:
            # Fallback names if OpenAI doesn't return properly
            fallback_names = [
                "Vintage Coffee Maker", "Antique Wooden Chair", "Classic Vinyl Record Collection",
                "Retro Gaming Console", "Handmade Ceramic Vase", "Designer Leather Jacket",
                "Rare Book Collection", "Vintage Camera Set", "Artisan Handwoven Rug"
            ]
            name = random.choice(fallback_names)
        
        # Generate description
        description_response = client.responses.create(
            model="gpt-5-nano",
            input=f"Write a brief, engaging description (2-3 sentences) for a marketplace listing for: {name}. Make it sound appealing and highlight key features."
        )
        description = ""
        # Try output_text property first (if available)
        if hasattr(description_response, 'output_text') and description_response.output_text:
            description = description_response.output_text.strip()
        # Otherwise parse the output structure
        elif description_response.output and len(description_response.output) > 0:
            for output in description_response.output:
                if hasattr(output, 'content') and output.content:
                    for content_item in output.content:
                        if hasattr(content_item, 'text'):
                            description = content_item.text.strip()
                            break
                    if description:
                        break
        
        if not description:
            description = f"A great find! This {name.lower()} is in excellent condition and ready for a new home. Perfect for collectors and enthusiasts alike."
        
        # Generate image
        image_prompt = f"Generate an image of {name}. Make it look like a product photo for an online marketplace listing, with good lighting and a clean background."
        image_response = client.responses.create(
            model="gpt-5",
            input=image_prompt,
            tools=[{"type": "image_generation"}]
        )
        
        image_url = None
        if image_response.output:
            # Extract image data from response (matching user's example)
            image_data = [
                output.result
                for output in image_response.output
                if output.type == "image_generation_call"
            ]
            
            if image_data and image_data[0]:
                try:
                    # Decode base64 image data
                    image_base64 = image_data[0]
                    image_bytes = base64.b64decode(image_base64)
                    
                    # Upload to S3
                    image_url = upload_image_data(image_bytes, content_type='image/png', file_extension='png')
                except Exception as e:
                    # If image upload fails, continue without image
                    print(f"Error uploading image to S3: {str(e)}")
        
        # Generate a random price between $5 and $500
        price = round(random.uniform(5.0, 500.0), 2)
        
        # Return the generated listing data
        return Response({
            'name': name,
            'description': description,
            'price': float(price),
            'image_url': image_url
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
