from rest_framework import serializers
from .models import Garage, ParkingSpace, Reservation, PricingRule, BillingStatement, Contract
from django.contrib.auth.models import User


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user


class GarageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Garage
        fields = '__all__'


class ParkingSpaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParkingSpace
        fields = '__all__'


class ReservationSerializer(serializers.ModelSerializer):
    customer_username = serializers.SerializerMethodField()
    garage_name = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = '__all__'

    def get_customer_username(self, obj):
        return obj.customer.username if obj.customer else None

    def get_garage_name(self, obj):
        return obj.garage.name if obj.garage else None


class ContractSerializer(serializers.ModelSerializer):
    customer_username = serializers.SerializerMethodField()
    garage_name = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        fields = '__all__'

    def get_customer_username(self, obj):
        return obj.customer.username if obj.customer else None

    def get_garage_name(self, obj):
        return obj.garage.name if obj.garage else None


class PricingRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingRule
        fields = '__all__'


class BillingStatementSerializer(serializers.ModelSerializer):
    customer_username = serializers.SerializerMethodField()

    class Meta:
        model = BillingStatement
        fields = '__all__'

    def get_customer_username(self, obj):
        return obj.customer.username if obj.customer else None
