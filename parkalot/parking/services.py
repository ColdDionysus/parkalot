from .models import Garage, Reservation, ParkingSpace, PricingRule, BillingStatement, User
from django.utils import timezone
from decimal import Decimal
import datetime

class PricingService:
    @staticmethod
    def calculate_price(garage, start_time, end_time):
        rule = PricingRule.objects.filter(garage=garage).first()
        if not rule:
            return Decimal('10.00')
        
        duration_hours = Decimal((end_time - start_time).total_seconds()) / Decimal(3600)
        if duration_hours < 0:
            duration_hours = Decimal('1.0')
        
        peak = 1.0
        if 8 <= start_time.hour <= 18:
            peak = float(str(rule.peak_multiplier))
            
        return round(duration_hours * Decimal(str(rule.base_rate)) * Decimal(str(peak)), 2)

class OverbookingService:
    @staticmethod
    def can_reserve(garage, start_time, end_time):
        effective_capacity = int(garage.total_capacity * 1.10)
        
        overlapping = Reservation.objects.filter(
            garage=garage,
            status='active',
            start_time__lt=end_time,
            end_time__gt=start_time
        ).count()
        
        return overlapping < effective_capacity

class LPRService:
    @staticmethod
    def simulate_entry(garage_id, license_plate):
        now = timezone.now()
        res = Reservation.objects.filter(
            garage_id=garage_id,
            vehicle_registration=license_plate,
            status='active',
            start_time__lte=now + datetime.timedelta(hours=1),
            end_time__gte=now
        ).first()
        
        if not res:
            return {"success": False, "message": "No active reservation found for this vehicle."}
            
        space = ParkingSpace.objects.filter(garage_id=garage_id, is_occupied=False).first()
        if not space:
            count = ParkingSpace.objects.filter(garage_id=garage_id).count()
            space = ParkingSpace.objects.create(
                garage_id=garage_id, level=1, space_number=f"L1-{count+1}", is_occupied=True
            )
        else:
            space.is_occupied = True
            space.save()
            
        return {
            "success": True, 
            "message": "Welcome! Barrier opened.",
            "space": space.space_number,
            "reservation_id": res.id
        }
        
    @staticmethod
    def simulate_exit(garage_id, space_number):
        space = ParkingSpace.objects.filter(garage_id=garage_id, space_number=space_number).first()
        if space:
            space.is_occupied = False
            space.save()
            return {"success": True, "message": "Goodbye! Barrier opened."}
        return {"success": False, "message": "Space not found."}
