
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Trash2, Users, Building, Settings } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  Customer, 
  Hotel, 
  Service, 
  CreateBookingInput, 
  Booking,
  RoomType,
  MealPlan
} from '../../../server/src/schema';

interface BookingFormProps {
  onBookingCreated: (booking: Booking) => void;
}

interface HotelBookingItem {
  hotel_id: number;
  room_type: RoomType;
  meal_plan: MealPlan;
  check_in_date: string;
  check_out_date: string;
  number_of_rooms: number;
}

interface ServiceItem {
  service_id: number;
  quantity: number;
}

export function BookingForm({ onBookingCreated }: BookingFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [hotelBookings, setHotelBookings] = useState<HotelBookingItem[]>([]);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);

  const roomTypes: RoomType[] = ['single', 'double', 'triple', 'quad'];
  const mealPlans: MealPlan[] = ['no_meal', 'breakfast', 'halfboard', 'fullboard'];

  const loadData = useCallback(async () => {
    try {
      setError('');
      const [customersData, hotelsData, servicesData] = await Promise.all([
        trpc.getCustomers.query(),
        trpc.getHotels.query(),
        trpc.getServices.query()
      ]);
      setCustomers(customersData);
      setHotels(hotelsData);
      setServices(servicesData);
    } catch (error) {
      console.error('Failed to load form data:', error);
      setError('Failed to load form data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addHotelBooking = () => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    setHotelBookings(prev => [...prev, {
      hotel_id: 0,
      room_type: 'double',
      meal_plan: 'breakfast',
      check_in_date: today,
      check_out_date: tomorrow,
      number_of_rooms: 1
    }]);
  };

  const removeHotelBooking = (index: number) => {
    setHotelBookings(prev => prev.filter((_, i) => i !== index));
  };

  const updateHotelBooking = (index: number, field: keyof HotelBookingItem, value: string | number | RoomType | MealPlan) => {
    setHotelBookings(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const addServiceItem = () => {
    setServiceItems(prev => [...prev, {
      service_id: 0,
      quantity: 1
    }]);
  };

  const removeServiceItem = (index: number) => {
    setServiceItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateServiceItem = (index: number, field: keyof ServiceItem, value: number) => {
    setServiceItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const calculateEstimatedTotal = () => {
    let total = 0;

    // Calculate hotel costs
    hotelBookings.forEach(booking => {
      const hotel = hotels.find(h => h.id === booking.hotel_id);
      if (hotel && booking.check_in_date && booking.check_out_date) {
        const checkIn = new Date(booking.check_in_date);
        const checkOut = new Date(booking.check_out_date);
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        const sellingPrice = hotel.cost_price * (1 + hotel.selling_price_percentage / 100);
        total += sellingPrice * nights * booking.number_of_rooms;
      }
    });

    // Calculate service costs
    serviceItems.forEach(item => {
      const service = services.find(s => s.id === item.service_id);
      if (service) {
        const sellingPrice = service.cost_price * (1 + service.selling_price_percentage / 100);
        total += sellingPrice * item.quantity;
      }
    });

    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      setError('Please select a customer');
      return;
    }

    if (hotelBookings.length === 0 && serviceItems.length === 0) {
      setError('Please add at least one hotel booking or service');
      return;
    }

    // Validate hotel bookings
    for (const booking of hotelBookings) {
      if (!booking.hotel_id) {
        setError('Please select a hotel for all hotel bookings');
        return;
      }
      if (!booking.check_in_date || !booking.check_out_date) {
        setError('Please set check-in and check-out dates for all hotel bookings');
        return;
      }
      if (new Date(booking.check_out_date) <= new Date(booking.check_in_date)) {
        setError('Check-out date must be after check-in date');
        return;
      }
    }

    // Validate service items
    for (const item of serviceItems) {
      if (!item.service_id) {
        setError('Please select a service for all service items');
        return;
      }
    }

    setIsSaving(true);
    setError('');

    try {
      const bookingData: CreateBookingInput = {
        customer_id: selectedCustomer,
        hotel_bookings: hotelBookings.map(booking => ({
          ...booking,
          check_in_date: new Date(booking.check_in_date),
          check_out_date: new Date(booking.check_out_date)
        })),
        services: serviceItems
      };

      const newBooking = await trpc.createBooking.mutate(bookingData);
      onBookingCreated(newBooking);
    } catch (error) {
      console.error('Failed to create booking:', error);
      setError('Failed to create booking');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  

  const formatRoomType = (type: RoomType) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatMealPlan = (plan: MealPlan) => {
    switch (plan) {
      case 'no_meal': return 'No Meal';
      case 'breakfast': return 'Breakfast';
      case 'halfboard': return 'Half Board';
      case 'fullboard': return 'Full Board';
      default: return plan;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create New Booking</CardTitle>
          <CardDescription>Loading form data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <CardTitle>Customer Information</CardTitle>
          </div>
          <CardDescription>Select the customer for this booking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Customer *</Label>
            <Select value={selectedCustomer?.toString() || ''} onValueChange={(value) => setSelectedCustomer(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id.toString()}>
                    {customer.name} - {customer.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Hotel Bookings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <div>
                <CardTitle>Hotel Bookings</CardTitle>
                <CardDescription>Add hotel reservations to this booking</CardDescription>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={addHotelBooking}>
              <Plus className="h-4 w-4 mr-2" />
              Add Hotel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hotelBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hotel bookings added yet. Click "Add Hotel" to get started.
            </div>
          ) : (
            hotelBookings.map((booking, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Hotel Booking #{index + 1}</Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => removeHotelBooking(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Hotel *</Label>
                    <Select
                      value={booking.hotel_id.toString()}
                      onValueChange={(value) => updateHotelBooking(index, 'hotel_id', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select hotel..." />
                      </SelectTrigger>
                      <SelectContent>
                        {hotels.map(hotel => (
                          <SelectItem key={hotel.id} value={hotel.id.toString()}>
                            {hotel.name} - {hotel.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Room Type *</Label>
                    <Select
                      value={booking.room_type}
                      onValueChange={(value) => updateHotelBooking(index, 'room_type', value as RoomType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {formatRoomType(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Meal Plan *</Label>
                    <Select
                      value={booking.meal_plan}
                      onValueChange={(value) => updateHotelBooking(index, 'meal_plan', value as MealPlan)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {mealPlans.map(plan => (
                          <SelectItem key={plan} value={plan}>
                            {formatMealPlan(plan)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Number of Rooms *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={booking.number_of_rooms}
                      onChange={(e) => updateHotelBooking(index, 'number_of_rooms', parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Check-in Date *</Label>
                    <Input
                      type="date"
                      value={booking.check_in_date}
                      onChange={(e) => updateHotelBooking(index, 'check_in_date', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Check-out Date *</Label>
                    <Input
                      type="date"
                      value={booking.check_out_date}
                      onChange={(e) => updateHotelBooking(index, 'check_out_date', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <div>
                <CardTitle>Additional Services</CardTitle>
                <CardDescription>Add extra services to this booking</CardDescription>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={addServiceItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {serviceItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No services added yet. Click "Add Service" to include additional services.
            </div>
          ) : (
            serviceItems.map((item, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline">Service #{index + 1}</Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => removeServiceItem(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Service *</Label>
                    <Select
                      value={item.service_id.toString()}
                      onValueChange={(value) => updateServiceItem(index, 'service_id', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service..." />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map(service => (
                          <SelectItem key={service.id} value={service.id.toString()}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateServiceItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Summary</CardTitle>
          <CardDescription>Review your booking details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <span className="font-medium">Estimated Total Amount</span>
              <span className="text-2xl font-bold text-blue-600">
                {formatCurrency(calculateEstimatedTotal())}
              </span>
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Hotel bookings: {hotelBookings.length}</p>
              <p>• Additional services: {serviceItems.length}</p>
              <p>• This is an estimated total. Final amount will be calculated based on exact dates and services.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex space-x-4">
        <Button type="submit" disabled={isSaving} size="lg">
          {isSaving ? 'Creating Booking...' : 'Create Booking'}
        </Button>
      </div>
    </form>
  );
}
