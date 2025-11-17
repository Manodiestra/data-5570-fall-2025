# AWS S3 Setup Guide for Image Uploads

This guide will help you set up an AWS S3 bucket for storing listing images in your SaleAway application.

## Prerequisites

- AWS Account
- AWS CLI installed (optional, but helpful)
- Access to AWS Console

## Step 1: Create S3 Bucket

1. **Log in to AWS Console**
   - Go to https://console.aws.amazon.com/
   - Navigate to S3 service

2. **Create a New Bucket**
   - Click "Create bucket"
   - Bucket name: Choose a unique name (e.g., `saleaway-images-{your-account-id}`)
   - AWS Region: Choose the same region as your Cognito User Pool (e.g., `us-east-1`)
   - **Important Settings:**
     - **Block Public Access**: Uncheck "Block all public access" (we need public read access for images)
     - **Bucket Versioning**: Optional (can enable for backup)
     - **Default Encryption**: Enable (SSE-S3 is fine)
   - Click "Create bucket"

3. **Configure Bucket Policy for Public Read Access**
   - Go to your bucket → Permissions tab
   - Scroll to "Bucket policy"
   - Add the following policy (replace `YOUR-BUCKET-NAME` with your actual bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

4. **Configure CORS (Cross-Origin Resource Sharing)**
   - Go to your bucket → Permissions tab
   - Scroll to "Cross-origin resource sharing (CORS)"
   - Add the following CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

   **Note:** For production, replace `"AllowedOrigins": ["*"]` with your specific domain(s).

## Step 2: Create IAM User for S3 Access

1. **Navigate to IAM**
   - Go to AWS Console → IAM service
   - Click "Users" in the left sidebar
   - Click "Create user"

2. **Create User**
   - User name: `saleaway-s3-uploader` (or your preferred name)
   - Select "Provide user access to the AWS Management Console" if you want console access (optional)
   - Click "Next"

3. **Attach Policies**
   - Click "Attach policies directly"
   - Search for and select: `AmazonS3FullAccess` (or create a custom policy with minimal permissions)
   - Click "Next" → "Create user"

4. **Create Access Keys**
   - Click on the newly created user
   - Go to "Security credentials" tab
   - Click "Create access key"
   - Select "Application running outside AWS"
   - Click "Next" → "Create access key"
   - **IMPORTANT:** Copy both the Access Key ID and Secret Access Key immediately (you won't be able to see the secret key again)

## Step 3: Install Required Python Packages

In your Django backend directory:

```bash
cd djangoBackend
source ../myvenv/bin/activate  # or activate your virtual environment
python3 -m pip install boto3
```

## Step 4: Configure Environment Variables

Add the following to your Django `.env` file (in `djangoBackend/.env`):

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name-here
AWS_ACCESS_KEY_ID=your-access-key-id-here
AWS_SECRET_ACCESS_KEY=your-secret-access-key-here
```

**Security Note:** 
- Never commit your `.env` file to version control
- Make sure `.env` is in your `.gitignore`
- For production, use AWS Secrets Manager or environment variables in your deployment platform

## Step 5: Create Database Migration

Run the following commands to create and apply the migration for the new `image_url` field:

```bash
cd djangoBackend
python manage.py makemigrations
python manage.py migrate
```

## Step 6: Test the Setup

1. **Start Django Server**
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

2. **Test Presigned URL Endpoint**
   - Use Postman or curl to test:
   ```bash
   curl -X POST http://localhost:8000/api/presigned-url/ \
     -H "Authorization: Bearer YOUR_ID_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"file_name": "test.jpg", "content_type": "image/jpeg"}'
   ```
   
   You should receive a response with `presigned_url`, `key`, and `url`.

3. **Test Image Upload in App**
   - Start your Expo app
   - Navigate to "Add New Item"
   - Try uploading an image
   - Verify the image appears in your S3 bucket

## Troubleshooting

### Issue: "Access Denied" when uploading to S3

**Solutions:**
- Verify your IAM user has the correct permissions
- Check that the bucket policy allows PUT operations
- Ensure your AWS credentials are correct in `.env`

### Issue: Images not displaying in the app

**Solutions:**
- Verify the bucket policy allows public GET access
- Check CORS configuration
- Ensure the `image_url` is correctly stored in the database
- Verify the S3 URL format is correct

### Issue: "Invalid presigned URL"

**Solutions:**
- Check that the presigned URL hasn't expired (default is 1 hour)
- Verify the content type matches when uploading
- Ensure the bucket name in `.env` is correct

## Security Best Practices

1. **Use IAM Roles Instead of Access Keys (for EC2/ECS)**
   - If deploying on AWS infrastructure, use IAM roles instead of access keys

2. **Limit IAM Permissions**
   - Instead of `AmazonS3FullAccess`, create a custom policy with only necessary permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject"
         ],
         "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
       }
     ]
   }
   ```

3. **Enable S3 Bucket Versioning**
   - Helps with recovery if files are accidentally delete
4. **Set Up Lifecycle Policies**
   - Automatically delete old images after a certain period
   - Move to cheaper storage classes (Glacier) for archived images

5. **Enable S3 Access Logging**
   - Monitor access to your bucket

## Cost Considerations

- **Storage:** First 50 TB: $0.023 per GB/month
- **Requests:** 
  - PUT requests: $0.005 per 1,000 requests
  - GET requests: $0.0004 per 1,000 requests
- **Data Transfer:** Free for first 100 GB/month (out to internet)

For a small application, costs should be minimal (< $1/month for typical usage).

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Boto3 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)
- [S3 Presigned URLs Guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)


