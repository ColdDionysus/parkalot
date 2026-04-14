from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from .models import Garage, ParkingSpace, Reservation, PricingRule, BillingStatement, Vehicle, Contract
from .serializers import (
    GarageSerializer, ParkingSpaceSerializer, ReservationSerializer,
    PricingRuleSerializer, BillingStatementSerializer, UserSerializer,
    ContractSerializer
)
from .services import PricingService, OverbookingService, LPRService
from django.contrib.auth.models import User
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from decimal import Decimal
import datetime


def _make_aware(dt):
    """Make a datetime timezone-aware if it isn't already."""
    if dt is None:
        return None
    if timezone.is_naive(dt):
        return timezone.make_aware(dt, timezone.utc)
    return dt


def _py_sum(queryset, field):
    """Python-level sum — avoids Djongo's broken SQL aggregation."""
    total = Decimal('0.00')
    for obj in queryset:
        val = getattr(obj, field, None)
        if val is not None:
            total += Decimal(str(val))
    return total


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == 'register':
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()
        email = request.data.get('email', '').strip()

        if not username or not password:
            return Response({'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already taken.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password, email=email)
        return Response({'id': str(user.pk), 'username': user.username, 'email': user.email}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def details(self, request, pk=None):
        """Admin: full profile of a user — reservations, contracts, billing."""
        if not request.user.is_staff and not request.user.is_superuser:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        reservations = list(Reservation.objects.filter(customer=target))
        contracts = list(Contract.objects.filter(customer=target))
        statements = list(BillingStatement.objects.filter(customer=target))

        def fmt_res(r):
            return {
                'id': str(r.pk), 'garage_name': r.garage.name if r.garage else '',
                'vehicle_registration': r.vehicle_registration,
                'start_time': r.start_time.isoformat() if r.start_time else None,
                'end_time': r.end_time.isoformat() if r.end_time else None,
                'charge': str(r.dynamic_price_charged), 'status': r.status,
                'reservation_type': r.reservation_type,
            }
        def fmt_contract(c):
            return {
                'id': str(c.pk), 'contract_type': c.contract_type,
                'garage_name': c.garage.name if c.garage else '',
                'monthly_fee': str(c.monthly_fee),
                'start_date': c.start_date.isoformat(),
                'end_date': c.end_date.isoformat() if c.end_date else None,
                'active': c.active,
            }
        def fmt_stmt(s):
            return {
                'id': str(s.pk), 'month': s.month, 'year': s.year,
                'total_amount': str(s.total_amount), 'is_paid': s.is_paid,
            }

        return Response({
            'user': {'id': str(target.pk), 'username': target.username, 'email': target.email, 'is_staff': target.is_staff},
            'reservations': [fmt_res(r) for r in reservations],
            'contracts': [fmt_contract(c) for c in contracts],
            'statements': [fmt_stmt(s) for s in statements],
        })


class GarageViewSet(viewsets.ModelViewSet):
    queryset = Garage.objects.all()
    serializer_class = GarageSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'spaces']:
            return [AllowAny()]
        return [IsAdminUser()]

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def create_garage(self, request):
        name = request.data.get('name', '').strip()
        location = request.data.get('location', '').strip()
        num_levels = int(request.data.get('num_levels', 1))
        spaces_per_level = int(request.data.get('spaces_per_level', 10))

        if not name or not location:
            return Response({'error': 'Name and location are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if num_levels < 1 or spaces_per_level < 1:
            return Response({'error': 'Levels and spaces per level must be at least 1.'}, status=status.HTTP_400_BAD_REQUEST)

        total_capacity = num_levels * spaces_per_level
        garage = Garage.objects.create(name=name, location=location, total_capacity=total_capacity)

        created = 0
        for level in range(1, num_levels + 1):
            for num in range(1, spaces_per_level + 1):
                ParkingSpace.objects.create(
                    garage=garage,
                    level=level,
                    space_number=f'{level}-{str(num).zfill(2)}',
                    is_occupied=False,
                )
                created += 1

        return Response({
            'garage': GarageSerializer(garage).data,
            'spaces_created': created,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def spaces(self, request, pk=None):
        garage = self.get_object()
        spaces = list(ParkingSpace.objects.filter(garage=garage))

        # Compute occupancy dynamically from active reservations
        # (is_occupied field is not reliably maintained)
        active_count = sum(
            1 for r in Reservation.objects.filter(garage=garage)
            if r.status == 'active'
        )

        # Mark the first active_count spaces as occupied
        result = []
        for i, space in enumerate(spaces):
            data = ParkingSpaceSerializer(space).data
            data['is_occupied'] = i < active_count
            result.append(data)

        return Response(result)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def generate_spaces(self, request, pk=None):
        garage = self.get_object()
        num_levels = int(request.data.get('num_levels', 1))
        spaces_per_level = int(request.data.get('spaces_per_level', 10))

        if num_levels < 1 or spaces_per_level < 1:
            return Response({'error': 'Levels and spaces per level must be at least 1.'}, status=status.HTTP_400_BAD_REQUEST)

        # Remove any existing spaces first
        existing = list(ParkingSpace.objects.filter(garage=garage))
        for sp in existing:
            sp.delete()

        total_capacity = num_levels * spaces_per_level
        garage.total_capacity = total_capacity
        garage.save()

        created = 0
        for level in range(1, num_levels + 1):
            for num in range(1, spaces_per_level + 1):
                ParkingSpace.objects.create(
                    garage=garage,
                    level=level,
                    space_number=f'{level}-{str(num).zfill(2)}',
                    is_occupied=False,
                )
                created += 1

        return Response({'spaces_created': created, 'total_capacity': total_capacity}, status=status.HTTP_201_CREATED)


class ParkingSpaceViewSet(viewsets.ModelViewSet):
    queryset = ParkingSpace.objects.all()
    serializer_class = ParkingSpaceSerializer


class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class = ReservationSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and (user.is_staff or user.is_superuser):
            return Reservation.objects.all()
        if user.is_authenticated:
            return Reservation.objects.filter(customer=user)
        return Reservation.objects.none()

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def mine(self, request):
        """Always return only the current user's reservations."""
        qs = Reservation.objects.filter(customer=request.user)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def create_reservation(self, request):
        garage_id = request.data.get('garage_id')
        start = _make_aware(parse_datetime(request.data.get('start_time', '')))
        end = _make_aware(parse_datetime(request.data.get('end_time', '')))
        plate = request.data.get('vehicle_registration', '').strip()
        reservation_type = request.data.get('reservation_type', 'one-off')
        # Recurring: list of extra dates as ISO strings
        recur_dates = request.data.get('recur_dates', [])

        if not garage_id or not start or not end or not plate:
            return Response({'error': 'garage_id, start_time, end_time, and vehicle_registration are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if end <= start:
            return Response({'error': 'End time must be after start time.'}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            garage = Garage.objects.get(id=garage_id)
        except Garage.DoesNotExist:
            return Response({'error': 'Garage not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not OverbookingService.can_reserve(garage, start, end):
            return Response({'error': 'Garage is at maximum predictive capacity for this time slot.'}, status=status.HTTP_400_BAD_REQUEST)

        price = PricingService.calculate_price(garage, start, end)

        res = Reservation.objects.create(
            customer=request.user,
            garage=garage,
            start_time=start,
            end_time=end,
            vehicle_registration=plate,
            dynamic_price_charged=price,
            reservation_type=reservation_type,
        )

        # Create additional recurring instances
        created = [res]
        if reservation_type == 'recurring' and recur_dates:
            duration = end - start
            for date_str in recur_dates:
                r_start = _make_aware(parse_datetime(date_str))
                if r_start is None:
                    continue
                r_end = r_start + duration
                r_price = PricingService.calculate_price(garage, r_start, r_end)
                r = Reservation.objects.create(
                    customer=request.user,
                    garage=garage,
                    start_time=r_start,
                    end_time=r_end,
                    vehicle_registration=plate,
                    dynamic_price_charged=r_price,
                    reservation_type='recurring',
                )
                created.append(r)

        serializer = self.get_serializer(created, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def preview_price(self, request):
        garage_id = request.data.get('garage_id')
        start = _make_aware(parse_datetime(request.data.get('start_time', '')))
        end = _make_aware(parse_datetime(request.data.get('end_time', '')))

        if not garage_id or not start or not end:
            return Response({'error': 'garage_id, start_time, and end_time are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            garage = Garage.objects.get(id=garage_id)
        except Garage.DoesNotExist:
            return Response({'error': 'Garage not found.'}, status=status.HTTP_404_NOT_FOUND)

        price = PricingService.calculate_price(garage, start, end)
        return Response({'price': str(price)})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        res = self.get_object()

        if res.customer != request.user and not request.user.is_staff:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if res.status != 'active':
            return Response({'error': 'Only active reservations can be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        # Use pymongo directly to avoid Djongo Decimal128 serialization bug on save()
        import pymongo
        client = pymongo.MongoClient('mongodb://localhost:27017')
        db = client['parkalot_v2']
        db['parking_reservation'].update_one({'id': res.pk}, {'$set': {'status': 'cancelled'}})
        client.close()

        return Response({'message': 'Reservation cancelled successfully.'})


class ContractViewSet(viewsets.ModelViewSet):
    serializer_class = ContractSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and (user.is_staff or user.is_superuser):
            return Contract.objects.all()
        if user.is_authenticated:
            return Contract.objects.filter(customer=user)
        return Contract.objects.none()

    @staticmethod
    def _calc_monthly_fee(garage, contract_type, num_spaces=1):
        """
        Auto-calculate monthly fee from the garage's PricingRule.
        Formula: base_rate × peak_multiplier × 30 (daily slots/month).
        Corporate scales by num_spaces.
        """
        rule = PricingRule.objects.filter(garage=garage).first()
        if rule:
            base = Decimal(str(rule.base_rate))
            peak = Decimal(str(rule.peak_multiplier))
        else:
            base = Decimal('5.00')
            peak = Decimal('1.5')
        per_space = round(base * peak * Decimal('30'), 2)
        spaces = max(1, int(num_spaces)) if contract_type == 'corporate' else 1
        return round(per_space * spaces, 2)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def preview_price(self, request):
        garage_id = request.query_params.get('garage_id')
        contract_type = request.query_params.get('contract_type', 'subscription')
        num_spaces = int(request.query_params.get('num_spaces', 1))
        duration_months = int(request.query_params.get('duration_months', 1))

        if not garage_id:
            return Response({'error': 'garage_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            garage = Garage.objects.get(id=garage_id)
        except Garage.DoesNotExist:
            return Response({'error': 'Garage not found.'}, status=status.HTTP_404_NOT_FOUND)

        monthly = ContractViewSet._calc_monthly_fee(garage, contract_type, num_spaces)
        total = round(monthly * duration_months, 2)
        return Response({'monthly_fee': str(monthly), 'total': str(total)})

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def create_contract(self, request):
        import calendar as cal_mod
        garage_id = request.data.get('garage_id')
        contract_type = request.data.get('contract_type', 'subscription')
        start_date_str = request.data.get('start_date')
        duration_months = int(request.data.get('duration_months', 1))
        num_spaces = int(request.data.get('num_spaces', 1))

        if not garage_id or not start_date_str:
            return Response({'error': 'garage_id and start_date are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            garage = Garage.objects.get(id=garage_id)
        except Garage.DoesNotExist:
            return Response({'error': 'Garage not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Auto-calculate monthly fee from garage pricing rule
        monthly_fee = ContractViewSet._calc_monthly_fee(garage, contract_type, num_spaces)

        from datetime import date
        start_date = datetime.date.fromisoformat(start_date_str)
        end_month = start_date.month + duration_months
        end_year = start_date.year + (end_month - 1) // 12
        end_month = ((end_month - 1) % 12) + 1
        last_day = cal_mod.monthrange(end_year, end_month)[1]
        end_date = datetime.date(end_year, end_month, min(start_date.day, last_day))

        contract = Contract.objects.create(
            customer=request.user,
            garage=garage,
            contract_type=contract_type,
            monthly_fee=monthly_fee,
            start_date=start_date,
            end_date=end_date,
            active=True,
        )

        from .serializers import ContractSerializer as CS
        return Response(CS(contract).data, status=status.HTTP_201_CREATED)


class PricingRuleViewSet(viewsets.ModelViewSet):
    queryset = PricingRule.objects.all()
    serializer_class = PricingRuleSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]


class BillingStatementViewSet(viewsets.ModelViewSet):
    serializer_class = BillingStatementSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and (user.is_staff or user.is_superuser):
            return BillingStatement.objects.all()
        if user.is_authenticated:
            return BillingStatement.objects.filter(customer=user)
        return BillingStatement.objects.none()

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def mine(self, request):
        """Always return only the current user's billing statements."""
        qs = BillingStatement.objects.filter(customer=request.user)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def invoice(self, request, pk=None):
        stmt = self.get_object()
        if stmt.customer != request.user and not request.user.is_staff and not request.user.is_superuser:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        month, year = stmt.month, stmt.year

        # All reservations in this billing period
        all_res = list(Reservation.objects.filter(customer=stmt.customer))
        month_res = [r for r in all_res
                     if r.start_time and r.start_time.month == month and r.start_time.year == year]

        def fmt_res(r):
            return {
                'id': str(r.pk),
                'vehicle_registration': r.vehicle_registration,
                'garage_name': r.garage.name if r.garage else '',
                'start_time': r.start_time.isoformat() if r.start_time else None,
                'end_time': r.end_time.isoformat() if r.end_time else None,
                'charge': str(r.dynamic_price_charged),
                'status': r.status,
                'reservation_type': r.reservation_type,
            }

        one_off = [fmt_res(r) for r in month_res if r.reservation_type == 'one-off']
        recurring = [fmt_res(r) for r in month_res if r.reservation_type == 'recurring']
        contract_res = [fmt_res(r) for r in month_res if r.reservation_type == 'contract']

        # Active contracts for this customer during this period
        contracts_raw = list(Contract.objects.filter(customer=stmt.customer))
        period_start = datetime.date(year, month, 1)
        import calendar
        last_day = calendar.monthrange(year, month)[1]
        period_end = datetime.date(year, month, last_day)

        contracts = []
        for c in contracts_raw:
            if c.start_date <= period_end and (c.end_date is None or c.end_date >= period_start):
                contracts.append({
                    'id': str(c.pk),
                    'contract_type': c.contract_type,
                    'garage_name': c.garage.name if c.garage else '',
                    'monthly_fee': str(c.monthly_fee),
                    'start_date': c.start_date.isoformat(),
                    'end_date': c.end_date.isoformat() if c.end_date else None,
                })

        return Response({
            'statement': {
                'id': str(stmt.pk),
                'month': month,
                'year': year,
                'total_amount': str(stmt.total_amount),
                'is_paid': stmt.is_paid,
                'customer_username': stmt.customer.username,
                'customer_email': stmt.customer.email,
            },
            'one_off': one_off,
            'recurring': recurring,
            'contract_reservations': contract_res,
            'contracts': contracts,
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def generate_monthly(self, request):
        if not request.user.is_staff and not request.user.is_superuser:
            return Response({'error': 'Permission denied. Managers only.'}, status=status.HTTP_403_FORBIDDEN)

        now = datetime.datetime.now()
        month = int(request.data.get('month', now.month))
        year = int(request.data.get('year', now.year))

        created_count = 0
        for user in User.objects.all():
            reservations = Reservation.objects.filter(
                customer=user,
                status__in=['active', 'completed']
            )
            # Filter by month/year in Python to avoid Djongo __month/__year lookup issues
            month_res = [r for r in reservations
                         if r.start_time and r.start_time.month == month and r.start_time.year == year]
            total = sum(Decimal(str(r.dynamic_price_charged)) for r in month_res)

            if total > 0:
                existing = BillingStatement.objects.filter(customer=user, month=month, year=year).first()
                if existing:
                    existing.total_amount = total
                    existing.save()
                else:
                    BillingStatement.objects.create(customer=user, month=month, year=year, total_amount=total)
                created_count += 1

        return Response({'message': f'Generated billing for {created_count} customer(s).', 'month': month, 'year': year})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def revenue_summary(self, request):
        if not request.user.is_staff and not request.user.is_superuser:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        # Fetch all at once and filter in Python — avoids Djongo boolean/IN query bugs
        try:
            all_statements = list(BillingStatement.objects.all())
        except Exception:
            all_statements = []

        total = sum(Decimal(str(s.total_amount)) for s in all_statements)
        paid = sum(Decimal(str(s.total_amount)) for s in all_statements if s.is_paid)
        pending = sum(Decimal(str(s.total_amount)) for s in all_statements if not s.is_paid)

        # Fallback: sum directly from reservations when no billing statements exist
        if total == Decimal('0.00'):
            try:
                all_res = list(Reservation.objects.all())
                total = sum(
                    Decimal(str(r.dynamic_price_charged))
                    for r in all_res
                    if r.status in ('active', 'completed')
                )
            except Exception:
                total = Decimal('0.00')

        return Response({
            'total_revenue': str(total),
            'paid': str(paid),
            'pending': str(pending),
        })


class LPRViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['post'])
    def entry(self, request):
        plate = request.data.get('license_plate', '').strip()
        garage_id = request.data.get('garage_id')
        result = LPRService.simulate_entry(garage_id, plate)
        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        return Response(result, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def exit(self, request):
        space = request.data.get('space_number', '').strip()
        garage_id = request.data.get('garage_id')
        result = LPRService.simulate_exit(garage_id, space)
        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)
