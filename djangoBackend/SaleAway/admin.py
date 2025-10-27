from django.contrib import admin
from .models import Listing, Location

# Register your models here.

@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'list_date', 'last_edited_date']
    list_filter = ['list_date', 'last_edited_date']
    search_fields = ['name', 'description']
    readonly_fields = ['list_date', 'last_edited_date']


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ['name', 'city', 'state', 'created_date', 'updated_date']
    list_filter = ['state', 'created_date', 'updated_date']
    search_fields = ['name', 'address', 'city', 'state', 'zip']
    readonly_fields = ['created_date', 'updated_date']
