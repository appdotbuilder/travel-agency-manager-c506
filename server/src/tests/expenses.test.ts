
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, usersTable, bookingsTable, expensesTable } from '../db/schema';
import { type CreateExpenseInput } from '../schema';
import { getExpensesByBookingId, createExpense } from '../handlers/expenses';
import { eq } from 'drizzle-orm';

describe('expenses handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let customerId: number;
  let userId: number;
  let bookingId: number;

  beforeEach(async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test Street',
        phone: '+1234567890',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    customerId = customerResult[0].id;

    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        username: 'testuser',
        password_hash: 'hashedpassword',
        role: 'staff'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create prerequisite booking
    const bookingResult = await db.insert(bookingsTable)
      .values({
        customer_id: customerId,
        booking_number: 'BK001',
        total_cost_price: '1000.00',
        total_selling_price: '1200.00',
        created_by: userId
      })
      .returning()
      .execute();
    bookingId = bookingResult[0].id;
  });

  describe('getExpensesByBookingId', () => {
    it('should return empty array when no expenses exist', async () => {
      const result = await getExpensesByBookingId(bookingId);

      expect(result).toEqual([]);
    });

    it('should return expenses for a specific booking', async () => {
      // Create test expenses
      await db.insert(expensesTable)
        .values([
          {
            booking_id: bookingId,
            expense_name: 'Transportation',
            amount: '50.00',
            created_by: userId
          },
          {
            booking_id: bookingId,
            expense_name: 'Meals',
            amount: '75.50',
            created_by: userId
          }
        ])
        .execute();

      const result = await getExpensesByBookingId(bookingId);

      expect(result).toHaveLength(2);
      expect(result[0].expense_name).toEqual('Transportation');
      expect(result[0].amount).toEqual(50.00);
      expect(typeof result[0].amount).toBe('number');
      expect(result[0].booking_id).toEqual(bookingId);
      expect(result[0].created_by).toEqual(userId);
      expect(result[0].created_at).toBeInstanceOf(Date);
      
      expect(result[1].expense_name).toEqual('Meals');
      expect(result[1].amount).toEqual(75.50);
      expect(typeof result[1].amount).toBe('number');
    });

    it('should only return expenses for the specified booking', async () => {
      // Create another booking
      const otherBookingResult = await db.insert(bookingsTable)
        .values({
          customer_id: customerId,
          booking_number: 'BK002',
          total_cost_price: '500.00',
          total_selling_price: '600.00',
          created_by: userId
        })
        .returning()
        .execute();
      const otherBookingId = otherBookingResult[0].id;

      // Create expenses for both bookings
      await db.insert(expensesTable)
        .values([
          {
            booking_id: bookingId,
            expense_name: 'Transportation',
            amount: '50.00',
            created_by: userId
          },
          {
            booking_id: otherBookingId,
            expense_name: 'Other Expense',
            amount: '25.00',
            created_by: userId
          }
        ])
        .execute();

      const result = await getExpensesByBookingId(bookingId);

      expect(result).toHaveLength(1);
      expect(result[0].expense_name).toEqual('Transportation');
      expect(result[0].booking_id).toEqual(bookingId);
    });
  });

  describe('createExpense', () => {
    const testInput: CreateExpenseInput = {
      booking_id: 0, // Will be set in test
      expense_name: 'Test Expense',
      amount: 100.50
    };

    it('should create an expense', async () => {
      const input = { ...testInput, booking_id: bookingId };
      const result = await createExpense(input, userId);

      expect(result.expense_name).toEqual('Test Expense');
      expect(result.amount).toEqual(100.50);
      expect(typeof result.amount).toBe('number');
      expect(result.booking_id).toEqual(bookingId);
      expect(result.created_by).toEqual(userId);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save expense to database', async () => {
      const input = { ...testInput, booking_id: bookingId };
      const result = await createExpense(input, userId);

      const expenses = await db.select()
        .from(expensesTable)
        .where(eq(expensesTable.id, result.id))
        .execute();

      expect(expenses).toHaveLength(1);
      expect(expenses[0].expense_name).toEqual('Test Expense');
      expect(parseFloat(expenses[0].amount)).toEqual(100.50);
      expect(expenses[0].booking_id).toEqual(bookingId);
      expect(expenses[0].created_by).toEqual(userId);
      expect(expenses[0].created_at).toBeInstanceOf(Date);
    });

    it('should throw error when booking does not exist', async () => {
      const input = { ...testInput, booking_id: 999999 };

      expect(createExpense(input, userId)).rejects.toThrow(/booking.*not found/i);
    });

    it('should handle decimal amounts correctly', async () => {
      const input = { ...testInput, booking_id: bookingId, amount: 123.45 };
      const result = await createExpense(input, userId);

      expect(result.amount).toEqual(123.45);
      expect(typeof result.amount).toBe('number');

      // Verify in database
      const expenses = await db.select()
        .from(expensesTable)
        .where(eq(expensesTable.id, result.id))
        .execute();

      expect(parseFloat(expenses[0].amount)).toEqual(123.45);
    });
  });
});
