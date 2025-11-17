"""
Utility functions for S3 operations
"""
import os
import boto3
from botocore.config import Config
from datetime import datetime, timedelta
import uuid

def get_s3_client():
    """Get configured S3 client"""
    aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID')
    aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
    region = os.getenv('AWS_REGION', 'us-east-1')
    
    if not aws_access_key_id or not aws_secret_access_key:
        raise ValueError('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set in environment variables')
    
    return boto3.client(
        's3',
        region_name=region,
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        config=Config(signature_version='s3v4')
    )

def generate_presigned_url(file_name: str, content_type: str, expiration: int = 3600) -> dict:
    """
    Generate a presigned URL for uploading a file to S3
    
    Args:
        file_name: Name of the file to upload
        content_type: MIME type of the file
        expiration: URL expiration time in seconds (default: 1 hour)
    
    Returns:
        dict with 'url' (presigned URL) and 'key' (S3 object key)
    """
    s3_client = get_s3_client()
    bucket_name = os.getenv('AWS_S3_BUCKET_NAME')
    
    if not bucket_name:
        raise ValueError('AWS_S3_BUCKET_NAME environment variable is not set')
    
    # Generate unique key for the file
    # Format: listings/{timestamp}/{uuid}.{extension}
    file_extension = file_name.split('.')[-1] if '.' in file_name else 'jpg'
    unique_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().strftime('%Y%m%d')
    s3_key = f"listings/{timestamp}/{unique_id}.{file_extension}"
    
    # Generate presigned URL for PUT operation
    presigned_url = s3_client.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': bucket_name,
            'Key': s3_key,
            'ContentType': content_type,
        },
        ExpiresIn=expiration
    )
    
    # Generate the public URL for the object
    object_url = f"https://{bucket_name}.s3.{os.getenv('AWS_REGION', 'us-east-1')}.amazonaws.com/{s3_key}"
    
    return {
        'presigned_url': presigned_url,
        'key': s3_key,
        'url': object_url,  # Public URL after upload
    }

