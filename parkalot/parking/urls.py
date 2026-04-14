from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    GarageViewSet, ParkingSpaceViewSet, ReservationViewSet,
    PricingRuleViewSet, BillingStatementViewSet, UserViewSet,
    LPRViewSet, ContractViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'garages', GarageViewSet)
router.register(r'spaces', ParkingSpaceViewSet)
router.register(r'reservations', ReservationViewSet, basename='reservation')
router.register(r'contracts', ContractViewSet, basename='contract')
router.register(r'pricing', PricingRuleViewSet)
router.register(r'billing', BillingStatementViewSet, basename='billing')
router.register(r'lpr', LPRViewSet, basename='lpr')

urlpatterns = [
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
]
