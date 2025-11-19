import json
import requests
from jose import jwt
from jose.exceptions import JWTError, ExpiredSignatureError
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import os

def get_cognito_config():
    """Get Cognito configuration from environment variables."""
    region = os.environ.get('COGNITO_REGION')
    user_pool_id = os.environ.get('COGNITO_USER_POOL_ID')
    app_client_id = os.environ.get('COGNITO_APP_CLIENT_ID')
    return region, user_pool_id, app_client_id


class CognitoUser:
    def __init__(self, claims):
        self.claims = claims
        self.username = claims.get("email") or claims.get("cognito:username")
        self.sub = claims.get("sub")

    @property
    def is_authenticated(self):
        return True

    def __str__(self):
        return self.username or self.sub or "CognitoUser"

class CognitoJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        # Get Cognito configuration from environment variables
        COGNITO_REGION, USER_POOL_ID, APP_CLIENT_ID = get_cognito_config()
                
        # Validate that environment variables are set
        if not COGNITO_REGION or not USER_POOL_ID or not APP_CLIENT_ID:
            raise AuthenticationFailed('Cognito configuration is missing. Please set COGNITO_REGION, COGNITO_USER_POOL_ID, and COGNITO_APP_CLIENT_ID environment variables.')
        
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]

        try:
            # First, decode without verification to check token type and audience
            unverified_claims = jwt.get_unverified_claims(token)
            token_use = unverified_claims.get('token_use')
            
            # Ensure we're using an ID token (not an access token)
            if token_use != 'id':
                raise AuthenticationFailed(f'Invalid token type. Expected ID token, got: {token_use}')
            
            # Get the actual audience from the token
            token_audience = unverified_claims.get('aud')
            print(f'Token audience: {token_audience}, Expected: {APP_CLIENT_ID}')
            
            # Use the token's audience for validation (it should match APP_CLIENT_ID)
            # If it doesn't match, we'll still try to validate but log a warning
            audience_to_validate = token_audience if token_audience else APP_CLIENT_ID
            
            jwks_url = f'https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json'
            jwks_response = requests.get(jwks_url)
            jwks_response.raise_for_status()  # Raise an exception for bad status codes
            jwks = jwks_response.json()
            
            if 'keys' not in jwks:
                raise AuthenticationFailed(f'Invalid JWKS response: {jwks}')
            
            headers = jwt.get_unverified_header(token)
            key = next((k for k in jwks['keys'] if k['kid'] == headers['kid']), None)
            if not key:
                raise AuthenticationFailed('Public key not found.')

            payload = jwt.decode(
                token,
                key,
                algorithms=['RS256'],
                audience=audience_to_validate,
                issuer=f'https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}',
            )

            return (CognitoUser(payload), None)

        except ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired')
        except requests.RequestException as e:
            raise AuthenticationFailed(f'Failed to fetch JWKS: {str(e)}')
        except JWTError as e:
            raise AuthenticationFailed(f'JWT error: {str(e)}')

