import os
import django
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'parkalot.settings')
django.setup()

from parking.models import Garage, ParkingSpace, Reservation, PricingRule, BillingStatement
from django.contrib.auth.models import User

print("Clearing existing data...")
Garage.objects.all().delete()
User.objects.all().delete()
Reservation.objects.all().delete()
PricingRule.objects.all().delete()

print("Creating admin user...")
admin = User.objects.create_superuser('admin', 'admin@example.com', 'admin')
user1 = User.objects.create_user('john_doe', 'john@example.com', 'password123')

print("Creating Garages...")
g1 = Garage.objects.create(name='Downtown Central', location='123 Main St', total_capacity=500)
g2 = Garage.objects.create(name='Westside Plaza', location='456 West Ave', total_capacity=300)
g3 = Garage.objects.create(name='Airport Express', location='Terminal 2', total_capacity=1000)

print("Creating Reservations...")
now = timezone.now()
Reservation.objects.create(customer=user1, garage=g1, start_time=now - timedelta(hours=1), end_time=now + timedelta(hours=2), vehicle_registration='ABC-1234')
Reservation.objects.create(customer=user1, garage=g2, start_time=now, end_time=now + timedelta(hours=5), vehicle_registration='XYZ-9876')
Reservation.objects.create(customer=admin, garage=g3, start_time=now - timedelta(hours=4), end_time=now + timedelta(hours=4), vehicle_registration='OVK-911')

for i in range(120):
    Reservation.objects.create(customer=user1, garage=g1, start_time=now, end_time=now + timedelta(hours=3), vehicle_registration=f'FAKE-{i}')

for i in range(280):
    Reservation.objects.create(customer=user1, garage=g2, start_time=now, end_time=now + timedelta(hours=1), vehicle_registration=f'MOCK-{i}')

print("Creating Pricing Rules...")
PricingRule.objects.create(garage=g1, base_rate=5.00, peak_multiplier=1.5)
PricingRule.objects.create(garage=g2, base_rate=3.00, peak_multiplier=1.0)
PricingRule.objects.create(garage=g3, base_rate=10.00, peak_multiplier=2.0)

print("Database seeded with Garages, Users, Pricing Rules, and Reservations successfully!")
