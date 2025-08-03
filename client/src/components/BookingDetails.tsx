
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, FileText, CreditCard, Building, Settings, Calendar } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Booking, HotelBookingDetail, ServiceBookingDetail, Payment } from '../../../server/src/schema';
import { PaymentForm } from '@/components/PaymentForm';
import { ExpenseList } from '@/components/ExpenseList';

interface BookingDetailsProps {
  bookingId: number;
}

export function BookingDetails({ bookingId }: BookingDetailsProps) {
  const [bookingData, setBookingData] = useState<{
    booking: Booking;
    hotelBookings: HotelBookingDetail[];
    serviceBookings: ServiceBookingDetail[];
  } | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const loadBookingDetails = useCallback(async () => {
    try {
      setError('');
      const [bookingDetails, paymentsData, expensesData] = await Promise.all([
        trpc.getBookingById.query({ id: bookingId }),
        trpc.getPaymentsByBookingId.query({ bookingId }),
        trpc.getExpensesByBookingId.query({ bookingId })
      ]);

      if (!bookingDetails) {
        setError('Booking not found');
        return;
      }

      setBookingData(bookingDetails);
      setPayments(paymentsData);
      // Note: expenses loaded in ExpenseList component
      console.log('Expenses loaded:', expensesData.length);
    } catch (error) {
      console.error('Failed to load booking details:', error);
      setError('Failed to load booking details');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadBookingDetails();
  }, [loadBookingDetails]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatRoomType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatMealPlan = (plan: string) => {
    switch (plan) {
      case 'no_meal': return 'No Meal';
      case 'breakfast': return 'Breakfast';
      case 'halfboard': return 'Half Board';
      case 'fullboard': return 'Full Board';
      default: return plan;
    }
  };

  const calculateTotalPaid = () => {
    return payments.reduce((sum, payment) => sum + payment.amount_in_sar, 0);
  };

  const calculateOutstandingAmount = () => {
    if (!bookingData) return 0;
    return bookingData.booking.total_selling_price - calculateTotalPaid();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      case 'paid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePaymentAdded = (newPayment: Payment) => {
    setPayments(prev => [...prev, newPayment]);
    setShowPaymentForm(false);
    // Reload booking to get updated payment status
    loadBookingDetails();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!bookingData) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Booking not found</AlertDescription>
      </Alert>
    );
  }

  const { booking, hotelBookings, serviceBookings } = bookingData;

  return (
    <div className="space-y-6">
      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Booking {booking.booking_number}</span>
              </CardTitle>
              <CardDescription>
                Created on {booking.created_at.toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(booking.status)}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Badge>
              <Badge className={getPaymentStatusColor(booking.payment_status)}>
                {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold">{formatCurrency(booking.total_selling_price)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Amount Paid</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(calculateTotalPaid())}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Outstanding</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(calculateOutstandingAmount())}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hotel Bookings */}
      {hotelBookings.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <CardTitle>Hotel Bookings</CardTitle>
            </div>
            <CardDescription>
              Hotel reservations included in this booking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hotelBookings.map((hotelBooking, index) => (
              <div key={hotelBooking.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline">Hotel #{index + 1}</Badge>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Selling Price</p>
                    <p className="font-semibold">{formatCurrency(hotelBooking.selling_price)}</p>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Hotel ID</p>
                    <p>{hotelBooking.hotel_id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Room Type</p>
                    <p>{formatRoomType(hotelBooking.room_type)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Meal Plan</p>
                    <p>{formatMealPlan(hotelBooking.meal_plan)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Rooms</p>
                    <p>{hotelBooking.number_of_rooms}</p>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Check-in: {hotelBooking.check_in_date.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Check-out: {hotelBooking.check_out_date.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Service Bookings */}
      {serviceBookings.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Additional Services</CardTitle>
            </div>
            <CardDescription>
              Extra services included in this booking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {serviceBookings.map((serviceBooking, index) => (
              <div key={serviceBooking.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Badge variant="outline" className="mb-2">Service #{index + 1}</Badge>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Service ID</p>
                      <p>{serviceBooking.service_id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Quantity</p>
                      <p>{serviceBooking.quantity}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Selling Price</p>
                  <p className="font-semibold">{formatCurrency(serviceBooking.selling_price)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Payments Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <CardTitle>Payments</CardTitle>
              </div>
              <Button onClick={() => setShowPaymentForm(true)} size="sm">
                Add Payment
              </Button>
            </div>
            <CardDescription>
              Payment history for this booking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showPaymentForm ? (
              <PaymentForm
                bookingId={bookingId}
                onPaymentAdded={handlePaymentAdded}
                onCancel={() => setShowPaymentForm(false)}
              />
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No payments recorded yet
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{formatCurrency(payment.amount_in_sar)}</p>
                      <p className="text-sm text-gray-500">
                        {payment.currency !== 'SAR' && `${payment.amount} ${payment.currency} • `}
                        {payment.payment_date.toLocaleDateString()}
                      </p>
                      {payment.notes && (
                        <p className="text-sm text-gray-600 mt-1">{payment.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <ExpenseList bookingId={bookingId} />
      </div>
    </div>
  );
}
