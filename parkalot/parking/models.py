from django.db import models
from django.contrib.auth.models import User

class Garage(models.Model):
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=200)
    total_capacity = models.IntegerField(default=0)
    
    def __str__(self):
        return self.name

class ParkingSpace(models.Model):
    garage = models.ForeignKey(Garage, on_delete=models.CASCADE, related_name='spaces')
    level = models.IntegerField()
    space_number = models.CharField(max_length=20)
    is_occupied = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.garage.name} - L{self.level} - {self.space_number}"

class Vehicle(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vehicles', null=True, blank=True)
    license_plate = models.CharField(max_length=20, unique=True)
    make_model = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return self.license_plate

class Contract(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contracts')
    garage = models.ForeignKey(Garage, on_delete=models.CASCADE, related_name='contracts', null=True, blank=True)
    contract_type = models.CharField(max_length=50, choices=(('corporate', 'Corporate'), ('subscription', 'Subscription')))
    monthly_fee = models.DecimalField(max_digits=8, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)

class Reservation(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    TYPE_CHOICES = (
        ('one-off', 'One-Off'),
        ('recurring', 'Recurring'),
        ('contract', 'Contract'),
    )
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reservations')
    garage = models.ForeignKey(Garage, on_delete=models.CASCADE, related_name='reservations')
    reservation_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='one-off')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    vehicle_registration = models.CharField(max_length=20)
    dynamic_price_charged = models.DecimalField(max_digits=6, decimal_places=2, default=0.0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    def __str__(self):
        return f"{self.customer.username} at {self.garage.name} ({self.vehicle_registration})"

class PricingRule(models.Model):
    garage = models.ForeignKey(Garage, on_delete=models.CASCADE, related_name='pricing_rules')
    base_rate = models.DecimalField(max_digits=6, decimal_places=2)
    peak_multiplier = models.DecimalField(max_digits=4, decimal_places=2, default=1.0)

class BillingStatement(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='statements')
    month = models.IntegerField()
    year = models.IntegerField()
    total_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0.0)
    is_paid = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.customer.username} - {self.month}/{self.year}"
