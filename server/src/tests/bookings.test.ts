
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, usersTable, hotelsTable, servicesTable, bookingsTable } from '../db/schema';
import { type CreateBookingInput } from '../schema';
import { 
  getBookings, 
  getBookingById, 
  createBooking, 
  updateBookingStatus, 
  generateBookingInvoice 
} from '../handlers/bookings';

describe('bookings handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let customerId: number;
  let userId: number;
  let hotelId: number;
  let serviceId: number;

  beforeEach(async () => {
    // Create test customer
    const customerResults = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: 'Test Address',
        phone: '+1234567890',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    customerId = customerResults[0].id;

    // Create test user
    const userResults = await db.insert(usersTable)
      .values({
        name: 'Test User',
        username: 'testuser',
        password_hash: 'hashedpassword',
        role: 'staff'
      })
      .returning()
      .execute();
    userId = userResults[0].id;

    // Create test hotel
    const hotelResults = await db.insert(hotelsTable)
      .values({
        name: 'Test Hotel',
        location: 'Test Location',
        cost_price: '100.00',
        selling_price_percentage: '20.00'
      })
      .returning()
      .execute();
    hotelId = hotelResults[0].id;

    // Create test service
    const serviceResults = await db.insert(servicesTable)
      .values({
        name: 'Test Service',
        cost_price: '50.00',
        selling_price_percentage: '30.00'
      })
      .returning()
      .execute();
    serviceId = serviceResults[0].id;
  });

  describe('getBookings', () => {
    it('should return empty array when no bookings exist', async () => {
      const result = await getBookings();
      expect(result).toEqual([]);
    });

    it('should return all bookings with proper numeric conversions', async () => {
      // Create test booking
      await db.insert(bookingsTable)
        .values({
          customer_id: customerId,
          booking_number: 'BK123',
          total_cost_price: '100.50',
          total_selling_price: '120.60',
          status: 'draft',
          payment_status: 'pending',
          created_by: userId
        })
        .execute();

      const result = await getBookings();

      expect(result).toHaveLength(1);
      expect(result[0].booking_number).toEqual('BK123');
      expect(typeof result[0].total_cost_price).toBe('number');
      expect(result[0].total_cost_price).toEqual(100.50);
      expect(typeof result[0].total_selling_price).toBe('number');
      expect(result[0].total_selling_price).toEqual(120.60);
      expect(result[0].status).toEqual('draft');
      expect(result[0].payment_status).toEqual('pending');
    });
  });

  describe('getBookingById', () => {
    it('should return null when booking does not exist', async () => {
      const result = await getBookingById(999);
      expect(result).toBeNull();
    });

    it('should return booking with details when exists', async () => {
      // Create test booking
      const bookingResults = await db.insert(bookingsTable)
        .values({
          customer_id: customerId,
          booking_number: 'BK123',
          total_cost_price: '100.00',
          total_selling_price: '120.00',
          status: 'confirmed',
          payment_status: 'pending',
          created_by: userId
        })
        .returning()
        .execute();

      const bookingId = bookingResults[0].id;

      const result = await getBookingById(bookingId);

      expect(result).toBeDefined();
      expect(result!.booking.id).toEqual(bookingId);
      expect(result!.booking.booking_number).toEqual('BK123');
      expect(typeof result!.booking.total_cost_price).toBe('number');
      expect(result!.booking.total_cost_price).toEqual(100.00);
      expect(result!.booking.status).toEqual('confirmed');
      expect(result!.hotelBookings).toEqual([]);
      expect(result!.serviceBookings).toEqual([]);
    });
  });

  describe('createBooking', () => {
    const testInput: CreateBookingInput = {
      customer_id: 0, // Will be set in test
      hotel_bookings: [{
        hotel_id: 0, // Will be set in test
        room_type: 'double',
        meal_plan: 'breakfast',
        check_in_date: new Date('2024-01-15'),
        check_out_date: new Date('2024-01-20'),
        number_of_rooms: 2
      }],
      services: [{
        service_id: 0, // Will be set in test
        quantity: 3
      }]
    };

    it('should create booking with calculations', async () => {
      const input = {
        ...testInput,
        customer_id: customerId,
        hotel_bookings: [{
          ...testInput.hotel_bookings[0],
          hotel_id: hotelId
        }],
        services: [{
          ...testInput.services[0],
          service_id: serviceId
        }]
      };

      const result = await createBooking(input, userId);

      expect(result.customer_id).toEqual(customerId);
      expect(result.booking_number).toMatch(/^BK\d+$/);
      expect(result.status).toEqual('draft');
      expect(result.payment_status).toEqual('pending');
      expect(result.created_by).toEqual(userId);
      expect(typeof result.total_cost_price).toBe('number');
      expect(typeof result.total_selling_price).toBe('number');
      expect(result.total_cost_price).toBeGreaterThan(0);
      expect(result.total_selling_price).toBeGreaterThan(result.total_cost_price);
    });

    it('should throw error when customer does not exist', async () => {
      const input = {
        ...testInput,
        customer_id: 999,
        hotel_bookings: [{
          ...testInput.hotel_bookings[0],
          hotel_id: hotelId
        }],
        services: [{
          ...testInput.services[0],
          service_id: serviceId
        }]
      };

      await expect(createBooking(input, userId)).rejects.toThrow(/customer not found/i);
    });

    it('should throw error when user does not exist', async () => {
      const input = {
        ...testInput,
        customer_id: customerId,
        hotel_bookings: [{
          ...testInput.hotel_bookings[0],
          hotel_id: hotelId
        }],
        services: [{
          ...testInput.services[0],
          service_id: serviceId
        }]
      };

      await expect(createBooking(input, 999)).rejects.toThrow(/user not found/i);
    });
  });

  describe('updateBookingStatus', () => {
    it('should update booking status', async () => {
      // Create test booking
      const bookingResults = await db.insert(bookingsTable)
        .values({
          customer_id: customerId,
          booking_number: 'BK123',
          total_cost_price: '100.00',
          total_selling_price: '120.00',
          status: 'draft',
          payment_status: 'pending',
          created_by: userId
        })
        .returning()
        .execute();

      const bookingId = bookingResults[0].id;

      const result = await updateBookingStatus(bookingId, 'confirmed');

      expect(result.id).toEqual(bookingId);
      expect(result.status).toEqual('confirmed');
      expect(typeof result.total_cost_price).toBe('number');
      expect(result.total_cost_price).toEqual(100.00);
    });

    it('should throw error when booking does not exist', async () => {
      await expect(updateBookingStatus(999, 'confirmed')).rejects.toThrow(/booking not found/i);
    });
  });

  describe('generateBookingInvoice', () => {
    it('should generate invoice for existing booking', async () => {
      // Create test booking
      const bookingResults = await db.insert(bookingsTable)
        .values({
          customer_id: customerId,
          booking_number: 'BK123',
          total_cost_price: '100.00',
          total_selling_price: '120.00',
          status: 'confirmed',
          payment_status: 'pending',
          created_by: userId
        })
        .returning()
        .execute();

      const bookingId = bookingResults[0].id;

      const result = await generateBookingInvoice(bookingId);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toContain(`Invoice for Booking ID: ${bookingId}`);
    });

    it('should throw error when booking does not exist', async () => {
      await expect(generateBookingInvoice(999)).rejects.toThrow(/booking not found/i);
    });
  });
});
