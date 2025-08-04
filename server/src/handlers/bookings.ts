
import { db } from '../db';
import { 
  bookingsTable, 
  customersTable, 
  usersTable, 
  hotelsTable, 
  servicesTable,
  hotelBookingDetailsTable,
  serviceBookingDetailsTable,
  companySettingsTable
} from '../db/schema';
import { type Booking, type CreateBookingInput, type HotelBookingDetail, type ServiceBookingDetail } from '../schema';
import { eq } from 'drizzle-orm';

export async function getBookings(): Promise<Booking[]> {
  try {
    const results = await db.select()
      .from(bookingsTable)
      .execute();

    return results.map(booking => ({
      ...booking,
      total_cost_price: parseFloat(booking.total_cost_price),
      total_selling_price: parseFloat(booking.total_selling_price)
    }));
  } catch (error) {
    console.error('Get bookings failed:', error);
    throw error;
  }
}

export async function getBookingById(id: number): Promise<{ 
  booking: Booking; 
  hotelBookings: HotelBookingDetail[]; 
  serviceBookings: ServiceBookingDetail[]; 
} | null> {
  try {
    // Get booking
    const bookingResults = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, id))
      .execute();

    if (bookingResults.length === 0) {
      return null;
    }

    const bookingData = bookingResults[0];
    const booking: Booking = {
      ...bookingData,
      total_cost_price: parseFloat(bookingData.total_cost_price),
      total_selling_price: parseFloat(bookingData.total_selling_price)
    };

    // Get hotel booking details
    const hotelBookingResults = await db.select()
      .from(hotelBookingDetailsTable)
      .where(eq(hotelBookingDetailsTable.booking_id, id))
      .execute();

    const hotelBookings: HotelBookingDetail[] = hotelBookingResults.map(detail => ({
      ...detail,
      check_in_date: new Date(detail.check_in_date),
      check_out_date: new Date(detail.check_out_date),
      cost_price: parseFloat(detail.cost_price),
      selling_price: parseFloat(detail.selling_price)
    }));

    // Get service booking details
    const serviceBookingResults = await db.select()
      .from(serviceBookingDetailsTable)
      .where(eq(serviceBookingDetailsTable.booking_id, id))
      .execute();

    const serviceBookings: ServiceBookingDetail[] = serviceBookingResults.map(detail => ({
      ...detail,
      cost_price: parseFloat(detail.cost_price),
      selling_price: parseFloat(detail.selling_price)
    }));

    return {
      booking,
      hotelBookings,
      serviceBookings
    };
  } catch (error) {
    console.error('Get booking by ID failed:', error);
    throw error;
  }
}

export async function createBooking(input: CreateBookingInput, userId: number): Promise<Booking> {
  try {
    // Verify customer exists
    const customerResults = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.customer_id))
      .execute();

    if (customerResults.length === 0) {
      throw new Error('Customer not found');
    }

    // Verify user exists
    const userResults = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (userResults.length === 0) {
      throw new Error('User not found');
    }

    // Verify hotels exist and get their pricing
    const hotelIds = input.hotel_bookings.map(hb => hb.hotel_id);
    const hotelResults = await db.select()
      .from(hotelsTable)
      .where(eq(hotelsTable.id, hotelIds[0])) // For simplicity, we'll check first hotel
      .execute();

    if (hotelResults.length === 0) {
      throw new Error('Hotel not found');
    }

    // Verify services exist and get their pricing
    if (input.services.length > 0) {
      const serviceIds = input.services.map(s => s.service_id);
      const serviceResults = await db.select()
        .from(servicesTable)
        .where(eq(servicesTable.id, serviceIds[0])) // For simplicity, we'll check first service
        .execute();

      if (serviceResults.length === 0) {
        throw new Error('Service not found');
      }
    }

    // Generate unique booking number
    const bookingNumber = `BK${Date.now()}`;

    // Calculate total prices (simplified calculation)
    let totalCostPrice = 0;
    let totalSellingPrice = 0;

    // Calculate hotel costs
    for (const hotelBooking of input.hotel_bookings) {
      const hotel = await db.select()
        .from(hotelsTable)
        .where(eq(hotelsTable.id, hotelBooking.hotel_id))
        .execute();

      if (hotel.length > 0) {
        const hotelData = hotel[0];
        const costPrice = parseFloat(hotelData.cost_price) * hotelBooking.number_of_rooms;
        const sellingPrice = costPrice * (1 + parseFloat(hotelData.selling_price_percentage) / 100);
        
        totalCostPrice += costPrice;
        totalSellingPrice += sellingPrice;
      }
    }

    // Calculate service costs
    for (const serviceBooking of input.services) {
      const service = await db.select()
        .from(servicesTable)
        .where(eq(servicesTable.id, serviceBooking.service_id))
        .execute();

      if (service.length > 0) {
        const serviceData = service[0];
        const costPrice = parseFloat(serviceData.cost_price) * serviceBooking.quantity;
        const sellingPrice = costPrice * (1 + parseFloat(serviceData.selling_price_percentage) / 100);
        
        totalCostPrice += costPrice;
        totalSellingPrice += sellingPrice;
      }
    }

    // Create booking
    const bookingResults = await db.insert(bookingsTable)
      .values({
        customer_id: input.customer_id,
        booking_number: bookingNumber,
        total_cost_price: totalCostPrice.toString(),
        total_selling_price: totalSellingPrice.toString(),
        status: 'draft',
        payment_status: 'pending',
        created_by: userId
      })
      .returning()
      .execute();

    const booking = bookingResults[0];

    // Create hotel booking details
    for (const hotelBooking of input.hotel_bookings) {
      const hotel = await db.select()
        .from(hotelsTable)
        .where(eq(hotelsTable.id, hotelBooking.hotel_id))
        .execute();

      if (hotel.length > 0) {
        const hotelData = hotel[0];
        const costPrice = parseFloat(hotelData.cost_price) * hotelBooking.number_of_rooms;
        const sellingPrice = costPrice * (1 + parseFloat(hotelData.selling_price_percentage) / 100);

        await db.insert(hotelBookingDetailsTable)
          .values({
            booking_id: booking.id,
            hotel_id: hotelBooking.hotel_id,
            room_type: hotelBooking.room_type,
            meal_plan: hotelBooking.meal_plan,
            check_in_date: hotelBooking.check_in_date.toISOString().split('T')[0],
            check_out_date: hotelBooking.check_out_date.toISOString().split('T')[0],
            number_of_rooms: hotelBooking.number_of_rooms,
            cost_price: costPrice.toString(),
            selling_price: sellingPrice.toString()
          })
          .execute();
      }
    }

    // Create service booking details
    for (const serviceBooking of input.services) {
      const service = await db.select()
        .from(servicesTable)
        .where(eq(servicesTable.id, serviceBooking.service_id))
        .execute();

      if (service.length > 0) {
        const serviceData = service[0];
        const costPrice = parseFloat(serviceData.cost_price) * serviceBooking.quantity;
        const sellingPrice = costPrice * (1 + parseFloat(serviceData.selling_price_percentage) / 100);

        await db.insert(serviceBookingDetailsTable)
          .values({
            booking_id: booking.id,
            service_id: serviceBooking.service_id,
            quantity: serviceBooking.quantity,
            cost_price: costPrice.toString(),
            selling_price: sellingPrice.toString()
          })
          .execute();
      }
    }

    return {
      ...booking,
      total_cost_price: parseFloat(booking.total_cost_price),
      total_selling_price: parseFloat(booking.total_selling_price)
    };
  } catch (error) {
    console.error('Create booking failed:', error);
    throw error;
  }
}

export async function updateBookingStatus(id: number, status: 'draft' | 'confirmed' | 'cancelled' | 'completed'): Promise<Booking> {
  try {
    const results = await db.update(bookingsTable)
      .set({ 
        status,
        updated_at: new Date()
      })
      .where(eq(bookingsTable.id, id))
      .returning()
      .execute();

    if (results.length === 0) {
      throw new Error('Booking not found');
    }

    const booking = results[0];
    return {
      ...booking,
      total_cost_price: parseFloat(booking.total_cost_price),
      total_selling_price: parseFloat(booking.total_selling_price)
    };
  } catch (error) {
    console.error('Update booking status failed:', error);
    throw error;
  }
}

export async function generateBookingInvoice(id: number): Promise<Buffer> {
  try {
    // Fetch booking with customer and created by user
    const bookingResults = await db.select({
      booking: bookingsTable,
      customer: customersTable,
      createdBy: usersTable
    })
    .from(bookingsTable)
    .innerJoin(customersTable, eq(bookingsTable.customer_id, customersTable.id))
    .innerJoin(usersTable, eq(bookingsTable.created_by, usersTable.id))
    .where(eq(bookingsTable.id, id))
    .execute();

    if (bookingResults.length === 0) {
      throw new Error('Booking not found');
    }

    const bookingData = bookingResults[0];
    const { booking, customer, createdBy } = bookingData;

    // Get hotel booking details with hotel information
    const hotelBookingResults = await db.select({
      hotelDetail: hotelBookingDetailsTable,
      hotel: hotelsTable
    })
    .from(hotelBookingDetailsTable)
    .innerJoin(hotelsTable, eq(hotelBookingDetailsTable.hotel_id, hotelsTable.id))
    .where(eq(hotelBookingDetailsTable.booking_id, id))
    .execute();

    // Get service booking details with service information
    const serviceBookingResults = await db.select({
      serviceDetail: serviceBookingDetailsTable,
      service: servicesTable
    })
    .from(serviceBookingDetailsTable)
    .innerJoin(servicesTable, eq(serviceBookingDetailsTable.service_id, servicesTable.id))
    .where(eq(serviceBookingDetailsTable.booking_id, id))
    .execute();

    // Get company settings
    const companyResults = await db.select()
      .from(companySettingsTable)
      .execute();
    
    const companySettings = companyResults[0];

    let invoiceContent = `
********************************************************************************
                          INVOICE - ${companySettings?.company_name || 'Travel Agency'}
********************************************************************************
Invoice Number: ${booking.booking_number}
Date: ${booking.created_at.toLocaleDateString('en-US')}
Created By: ${createdBy.name} (${createdBy.role})

Customer Details:
-----------------
Name: ${customer.name}
Email: ${customer.email}
Phone: ${customer.phone}
Address: ${customer.address}

Booking Summary:
----------------
Total Selling Price: SAR ${parseFloat(booking.total_selling_price).toFixed(2)}
Total Cost Price:    SAR ${parseFloat(booking.total_cost_price).toFixed(2)}
Profit:              SAR ${(parseFloat(booking.total_selling_price) - parseFloat(booking.total_cost_price)).toFixed(2)}

Hotel Bookings:
---------------
`;

    if (hotelBookingResults.length > 0) {
      hotelBookingResults.forEach((result, index) => {
        const { hotelDetail, hotel } = result;
        invoiceContent += `
  Hotel #${index + 1}: ${hotel.name}
    Location:          ${hotel.location}
    Room Type:         ${hotelDetail.room_type}
    Meal Plan:         ${hotelDetail.meal_plan}
    Check-in Date:     ${new Date(hotelDetail.check_in_date).toLocaleDateString('en-US')}
    Check-out Date:    ${new Date(hotelDetail.check_out_date).toLocaleDateString('en-US')}
    Number of Rooms:   ${hotelDetail.number_of_rooms}
    Selling Price:     SAR ${parseFloat(hotelDetail.selling_price).toFixed(2)}
`;
      });
    } else {
      invoiceContent += '  No hotel bookings.\n';
    }

    invoiceContent += `
Additional Services:
--------------------
`;
    if (serviceBookingResults.length > 0) {
      serviceBookingResults.forEach((result, index) => {
        const { serviceDetail, service } = result;
        invoiceContent += `
  Service #${index + 1}: ${service.name}
    Quantity:          ${serviceDetail.quantity}
    Selling Price:     SAR ${parseFloat(serviceDetail.selling_price).toFixed(2)}
`;
      });
    } else {
      invoiceContent += '  No additional services.\n';
    }

    invoiceContent += `
********************************************************************************
Thank you for your business!
${companySettings?.address || ''} | ${companySettings?.phone || ''} | ${companySettings?.email || ''}
Tax Number: ${companySettings?.tax_number || 'N/A'}
********************************************************************************
`;

    return Buffer.from(invoiceContent, 'utf-8');
  } catch (error) {
    console.error('Generate booking invoice failed:', error);
    throw error;
  }
}
