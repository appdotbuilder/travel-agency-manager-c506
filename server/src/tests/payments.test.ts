
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  paymentsTable, 
  bookingsTable, 
  customersTable, 
  usersTable,
  currencyExchangeRatesTable
} from '../db/schema';
import { type CreatePaymentInput } from '../schema';
import { getPaymentsByBookingId, createPayment } from '../handlers/payments';
import { eq } from 'drizzle-orm';

describe('payments handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCustomerId: number;
  let testUserId: number;
  let testBookingId: number;

  beforeEach(async () => {
    // Create test customer
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: 'Test Address',
        phone: '123456789',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    testCustomerId = customer[0].id;

    // Create test user
    const user = await db.insert(usersTable)
      .values({
        name: 'Test User',
        username: 'testuser',
        password_hash: 'hashedpassword',
        role: 'staff'
      })
      .returning()
      .execute();
    testUserId = user[0].id;

    // Create test booking
    const booking = await db.insert(bookingsTable)
      .values({
        customer_id: testCustomerId,
        booking_number: 'B001',
        total_cost_price: '1000.00',
        total_selling_price: '1200.00',
        created_by: testUserId
      })
      .returning()
      .execute();
    testBookingId = booking[0].id;

    // Create exchange rate for USD to SAR
    await db.insert(currencyExchangeRatesTable)
      .values({
        from_currency: 'USD',
        to_currency: 'SAR',
        rate: '3.75'
      })
      .execute();
  });

  describe('getPaymentsByBookingId', () => {
    it('should return empty array when no payments exist', async () => {
      const result = await getPaymentsByBookingId(testBookingId);
      expect(result).toEqual([]);
    });

    it('should return payments for specific booking', async () => {
      // Create test payment
      await db.insert(paymentsTable)
        .values({
          booking_id: testBookingId,
          amount: '500.00',
          currency: 'SAR',
          amount_in_sar: '500.00',
          notes: 'Test payment',
          created_by: testUserId
        })
        .execute();

      const result = await getPaymentsByBookingId(testBookingId);

      expect(result).toHaveLength(1);
      expect(result[0].booking_id).toEqual(testBookingId);
      expect(result[0].amount).toEqual(500);
      expect(typeof result[0].amount).toEqual('number');
      expect(result[0].amount_in_sar).toEqual(500);
      expect(typeof result[0].amount_in_sar).toEqual('number');
      expect(result[0].currency).toEqual('SAR');
      expect(result[0].notes).toEqual('Test payment');
    });

    it('should return only payments for specified booking', async () => {
      // Create another booking
      const anotherBooking = await db.insert(bookingsTable)
        .values({
          customer_id: testCustomerId,
          booking_number: 'B002',
          total_cost_price: '800.00',
          total_selling_price: '1000.00',
          created_by: testUserId
        })
        .returning()
        .execute();

      // Create payments for both bookings
      await db.insert(paymentsTable)
        .values([
          {
            booking_id: testBookingId,
            amount: '500.00',
            currency: 'SAR',
            amount_in_sar: '500.00',
            created_by: testUserId
          },
          {
            booking_id: anotherBooking[0].id,
            amount: '300.00',
            currency: 'SAR',
            amount_in_sar: '300.00',
            created_by: testUserId
          }
        ])
        .execute();

      const result = await getPaymentsByBookingId(testBookingId);

      expect(result).toHaveLength(1);
      expect(result[0].booking_id).toEqual(testBookingId);
      expect(result[0].amount).toEqual(500);
    });
  });

  describe('createPayment', () => {
    const testInput: CreatePaymentInput = {
      booking_id: 0, // Will be set in test
      amount: 250.50,
      currency: 'SAR',
      notes: 'Test payment note'
    };

    it('should create payment with SAR currency', async () => {
      const input = { ...testInput, booking_id: testBookingId };
      const result = await createPayment(input, testUserId);

      expect(result.booking_id).toEqual(testBookingId);
      expect(result.amount).toEqual(250.50);
      expect(typeof result.amount).toEqual('number');
      expect(result.currency).toEqual('SAR');
      expect(result.amount_in_sar).toEqual(250.50);
      expect(typeof result.amount_in_sar).toEqual('number');
      expect(result.notes).toEqual('Test payment note');
      expect(result.created_by).toEqual(testUserId);
      expect(result.id).toBeDefined();
      expect(result.payment_date).toBeInstanceOf(Date);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create payment with USD currency and convert to SAR', async () => {
      const input: CreatePaymentInput = {
        booking_id: testBookingId,
        amount: 100.00,
        currency: 'USD',
        notes: 'USD payment'
      };

      const result = await createPayment(input, testUserId);

      expect(result.booking_id).toEqual(testBookingId);
      expect(result.amount).toEqual(100);
      expect(result.currency).toEqual('USD');
      expect(result.amount_in_sar).toEqual(375); // 100 * 3.75
      expect(typeof result.amount_in_sar).toEqual('number');
      expect(result.notes).toEqual('USD payment');
      expect(result.created_by).toEqual(testUserId);
    });

    it('should save payment to database', async () => {
      const input = { ...testInput, booking_id: testBookingId };
      const result = await createPayment(input, testUserId);

      const payments = await db.select()
        .from(paymentsTable)
        .where(eq(paymentsTable.id, result.id))
        .execute();

      expect(payments).toHaveLength(1);
      expect(payments[0].booking_id).toEqual(testBookingId);
      expect(parseFloat(payments[0].amount)).toEqual(250.50);
      expect(payments[0].currency).toEqual('SAR');
      expect(parseFloat(payments[0].amount_in_sar)).toEqual(250.50);
      expect(payments[0].notes).toEqual('Test payment note');
    });

    it('should throw error when booking does not exist', async () => {
      const input: CreatePaymentInput = {
        booking_id: 99999,
        amount: 100,
        currency: 'SAR',
        notes: null
      };

      await expect(() => createPayment(input, testUserId))
        .toThrow(/booking not found/i);
    });

    it('should throw error when exchange rate not found', async () => {
      const input: CreatePaymentInput = {
        booking_id: testBookingId,
        amount: 100,
        currency: 'IDR',
        notes: null
      };

      await expect(() => createPayment(input, testUserId))
        .toThrow(/exchange rate not found for IDR to SAR/i);
    });
  });
});
