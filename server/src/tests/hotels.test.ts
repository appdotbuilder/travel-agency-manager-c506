
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { hotelsTable, hotelBookingDetailsTable, bookingsTable, customersTable, usersTable } from '../db/schema';
import { type CreateHotelInput, type UpdateHotelInput } from '../schema';
import { getHotels, getHotelById, createHotel, updateHotel, deleteHotel } from '../handlers/hotels';
import { eq } from 'drizzle-orm';

const testHotelInput: CreateHotelInput = {
  name: 'Test Hotel',
  location: 'Test City',
  cost_price: 150.50,
  selling_price_percentage: 120.75
};

describe('Hotel Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createHotel', () => {
    it('should create a hotel', async () => {
      const result = await createHotel(testHotelInput);

      expect(result.name).toEqual('Test Hotel');
      expect(result.location).toEqual('Test City');
      expect(result.cost_price).toEqual(150.50);
      expect(result.selling_price_percentage).toEqual(120.75);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(typeof result.cost_price).toBe('number');
      expect(typeof result.selling_price_percentage).toBe('number');
    });

    it('should save hotel to database', async () => {
      const result = await createHotel(testHotelInput);

      const hotels = await db.select()
        .from(hotelsTable)
        .where(eq(hotelsTable.id, result.id))
        .execute();

      expect(hotels).toHaveLength(1);
      expect(hotels[0].name).toEqual('Test Hotel');
      expect(hotels[0].location).toEqual('Test City');
      expect(parseFloat(hotels[0].cost_price)).toEqual(150.50);
      expect(parseFloat(hotels[0].selling_price_percentage)).toEqual(120.75);
      expect(hotels[0].created_at).toBeInstanceOf(Date);
    });
  });

  describe('getHotels', () => {
    it('should return empty array when no hotels exist', async () => {
      const result = await getHotels();
      expect(result).toEqual([]);
    });

    it('should return all hotels', async () => {
      await createHotel(testHotelInput);
      await createHotel({
        name: 'Second Hotel',
        location: 'Another City',
        cost_price: 200.00,
        selling_price_percentage: 150.00
      });

      const result = await getHotels();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('Test Hotel');
      expect(result[1].name).toEqual('Second Hotel');
      expect(typeof result[0].cost_price).toBe('number');
      expect(typeof result[0].selling_price_percentage).toBe('number');
    });
  });

  describe('getHotelById', () => {
    it('should return null for non-existent hotel', async () => {
      const result = await getHotelById(999);
      expect(result).toBeNull();
    });

    it('should return hotel by ID', async () => {
      const created = await createHotel(testHotelInput);
      const result = await getHotelById(created.id);

      expect(result).not.toBeNull();
      expect(result?.id).toEqual(created.id);
      expect(result?.name).toEqual('Test Hotel');
      expect(result?.location).toEqual('Test City');
      expect(result?.cost_price).toEqual(150.50);
      expect(result?.selling_price_percentage).toEqual(120.75);
      expect(typeof result?.cost_price).toBe('number');
      expect(typeof result?.selling_price_percentage).toBe('number');
    });
  });

  describe('updateHotel', () => {
    it('should update hotel with all fields', async () => {
      const created = await createHotel(testHotelInput);
      
      const updateInput: UpdateHotelInput = {
        id: created.id,
        name: 'Updated Hotel',
        location: 'Updated City',
        cost_price: 175.25,
        selling_price_percentage: 130.50
      };

      const result = await updateHotel(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Updated Hotel');
      expect(result.location).toEqual('Updated City');
      expect(result.cost_price).toEqual(175.25);
      expect(result.selling_price_percentage).toEqual(130.50);
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
      expect(typeof result.cost_price).toBe('number');
      expect(typeof result.selling_price_percentage).toBe('number');
    });

    it('should update hotel with partial fields', async () => {
      const created = await createHotel(testHotelInput);
      
      const updateInput: UpdateHotelInput = {
        id: created.id,
        name: 'Partially Updated Hotel'
      };

      const result = await updateHotel(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Partially Updated Hotel');
      expect(result.location).toEqual('Test City'); // unchanged
      expect(result.cost_price).toEqual(150.50); // unchanged
      expect(result.selling_price_percentage).toEqual(120.75); // unchanged
    });

    it('should throw error for non-existent hotel', async () => {
      const updateInput: UpdateHotelInput = {
        id: 999,
        name: 'Non-existent Hotel'
      };

      expect(updateHotel(updateInput)).rejects.toThrow(/not found/i);
    });
  });

  describe('deleteHotel', () => {
    it('should delete hotel', async () => {
      const created = await createHotel(testHotelInput);
      
      await deleteHotel(created.id);

      const hotels = await db.select()
        .from(hotelsTable)
        .where(eq(hotelsTable.id, created.id))
        .execute();

      expect(hotels).toHaveLength(0);
    });

    it('should throw error for non-existent hotel', async () => {
      expect(deleteHotel(999)).rejects.toThrow(/not found/i);
    });

    it('should prevent deletion of hotel with existing bookings', async () => {
      const created = await createHotel(testHotelInput);

      // Create prerequisite data
      const customer = await db.insert(customersTable)
        .values({
          name: 'Test Customer',
          address: 'Test Address',
          phone: '123456789',
          email: 'test@example.com'
        })
        .returning()
        .execute();

      const user = await db.insert(usersTable)
        .values({
          name: 'Test User',
          username: 'testuser',
          password_hash: 'hashed_password',
          role: 'staff'
        })
        .returning()
        .execute();

      const booking = await db.insert(bookingsTable)
        .values({
          customer_id: customer[0].id,
          booking_number: 'BK001',
          total_cost_price: '100.00',
          total_selling_price: '120.00',
          created_by: user[0].id
        })
        .returning()
        .execute();

      // Create hotel booking detail - using values() method correctly
      await db.insert(hotelBookingDetailsTable)
        .values({
          booking_id: booking[0].id,
          hotel_id: created.id,
          room_type: 'single',
          meal_plan: 'breakfast',
          check_in_date: '2024-01-01',
          check_out_date: '2024-01-02',
          number_of_rooms: 1,
          cost_price: '100.00',
          selling_price: '120.00'
        })
        .execute();

      expect(deleteHotel(created.id)).rejects.toThrow(/existing bookings/i);
    });
  });
});
