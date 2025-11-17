from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ListingViewSet, LocationViewSet, get_presigned_url

router = DefaultRouter()
router.register(r'listings', ListingViewSet)
router.register(r'locations', LocationViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/presigned-url/', get_presigned_url, name='presigned-url'),
]
