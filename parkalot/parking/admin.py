from django.contrib import admin
from .models import Garage, ParkingSpace, Reservation, PricingRule, BillingStatement

admin.site.register(Garage)
admin.site.register(ParkingSpace)
admin.site.register(Reservation)
admin.site.register(PricingRule)
admin.site.register(BillingStatement)