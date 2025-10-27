from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ListingViewSet, LocationViewSet

router = DefaultRouter()
router.register(r'listings', ListingViewSet)
router.register(r'locations', LocationViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]
