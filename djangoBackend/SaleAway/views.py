from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework import status
from .models import Listing, Location
from .serializers import ListingSerializer, LocationSerializer
from .authentication import CognitoJWTAuthentication
from .s3_utils import generate_presigned_url, upload_image_to_s3
import os
from openai import OpenAI
import json
import base64

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


@api_view(['POST'])
@authentication_classes([CognitoJWTAuthentication])
@permission_classes([IsAuthenticated])
def generate_listing_data(request):
    """
    Auto-generate listing data (name, description, price, image) from a title using OpenAI.
    Requires authentication.
    
    Expected POST body:
    {
        "title": "Vintage Camera"
    }
    
    Returns:
    {
        "name": "Generated name",
        "description": "Generated description",
        "price": 99.99,
        "image_url": "https://..."
    }
    """
    try:
        title = request.data.get('title', '').strip()
        
        if not title:
            return Response(
                {'error': 'title is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get OpenAI API key from environment
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return Response(
                {'error': 'OpenAI API key not configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Initialize OpenAI client
        client = OpenAI(api_key=api_key)
        
        # Step 1: Generate listing text data using gpt-5-nano
        text_prompt = f"""Generate a detailed item listing for a marketplace based on this title: "{title}"

Please provide:
1. A catchy, descriptive name (max 200 characters)
2. A detailed description (2-4 sentences, max 500 characters) that highlights key features, condition, and why someone would want to buy it
3. A realistic price in USD (as a number, no currency symbols)

Return the response as a JSON object with these exact keys: "name", "description", "price"
The price should be a number (e.g., 99.99, not "$99.99")

Example format:
{{
    "name": "Vintage 35mm Film Camera - Excellent Condition",
    "description": "Beautiful vintage 35mm film camera from the 1980s. Fully functional with original lens. Perfect for photography enthusiasts or collectors. Includes original case and manual.",
    "price": 125.00
}}"""

        # Call OpenAI responses API for text generation
        text_response = client.responses.create(
            model="gpt-5-nano",
            input=text_prompt
        )
        
        # Extract text from response
        # Try output_text property first (convenience property)
        text_content = None
        if hasattr(text_response, 'output_text') and text_response.output_text:
            text_content = text_response.output_text.strip()
        else:
            # Fallback: parse from output list structure
            for message in text_response.output:
                if message.type == "message" and message.role == "assistant":
                    for content_item in message.content:
                        if content_item.type == "output_text":
                            text_content = content_item.text.strip()
                            break
                    if text_content:
                        break
        
        if not text_content:
            return Response(
                {'error': 'Failed to extract text from OpenAI response'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Try to extract JSON from the response (in case it's wrapped in markdown)
        if '```json' in text_content:
            text_content = text_content.split('```json')[1].split('```')[0].strip()
        elif '```' in text_content:
            text_content = text_content.split('```')[1].split('```')[0].strip()
        
        generated_data = json.loads(text_content)
        
        # Validate and clean the data
        name = generated_data.get('name', title)[:200]  # Ensure max length
        description = generated_data.get('description', '')[:500]  # Ensure max length
        price = float(generated_data.get('price', 0))
        
        # Ensure price is positive
        if price <= 0:
            price = 10.0  # Default fallback price
        
        # Step 2: Generate image using gpt-5 with image generation tool (dall-e-2)
        image_prompt = f"Generate an image of {title}"
        
        image_response = client.responses.create(
            model="dall-e-2",
            input=image_prompt,
            tools=[{"type": "image_generation", "model": "dall-e-2"}]
        )
        
        # Extract image data from response
        image_base64 = None
        for output in image_response.output:
            if output.type == "image_generation_call":
                image_base64 = output.result
                break
        
        image_url = None
        if image_base64:
            try:
                # Decode base64 image data
                image_data = base64.b64decode(image_base64)
                
                # Upload image to S3
                s3_result = upload_image_to_s3(
                    image_data,
                    file_extension='png',
                    content_type='image/png'
                )
                image_url = s3_result['url']
            except Exception as e:
                # If image upload fails, continue without image
                print(f"Failed to upload image to S3: {str(e)}")
        
        return Response({
            'name': name,
            'description': description,
            'price': price,
            'image_url': image_url
        }, status=status.HTTP_200_OK)
        
    except json.JSONDecodeError as e:
        return Response(
            {'error': f'Failed to parse OpenAI response: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
