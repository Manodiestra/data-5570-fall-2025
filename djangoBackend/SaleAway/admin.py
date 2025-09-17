from django.contrib import admin
from .models import Listing

# Register your models here.

@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'list_date', 'last_edited_date']
    list_filter = ['list_date', 'last_edited_date']
    search_fields = ['name', 'description']
    readonly_fields = ['list_date', 'last_edited_date']
