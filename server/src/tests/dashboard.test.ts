
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, usersTable, bookingsTable, paymentsTable, expensesTable } from '../db/schema';
import { getDashboardStats } from '../handlers/dashboard';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty stats when no data exists', async () => {
    const stats = await getDashboardStats();

    expect(stats.customer_count).toEqual(0);
    expect(stats.booking_count).toEqual(0);
    expect(stats.total_profit).toEqual(0);
    expect(stats.outstanding_payments).toEqual(0);
  });

  it('should calculate stats correctly with sample data', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        username: 'testuser',
        password_hash: 'hashed_password',
        role: 'staff'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test customers
    await db.insert(customersTable)
      .values([
        {
          name: 'Customer 1',
          address: 'Address 1',
          phone: '123456789',
          email: 'customer1@test.com'
        },
        {
          name: 'Customer 2', 
          address: 'Address 2',
          phone: '987654321',
          email: 'customer2@test.com'
        }
      ])
      .execute();

    const customerResult = await db.select()
      .from(customersTable)
      .execute();
    const customerId = customerResult[0].id;

    // Create test bookings
    const bookingResults = await db.insert(bookingsTable)
      .values([
        {
          customer_id: customerId,
          booking_number: 'BK001',
          total_cost_price: '1000.00',
          total_selling_price: '1500.00',
          status: 'confirmed',
          payment_status: 'partial',
          created_by: userId
        },
        {
          customer_id: customerId,
          booking_number: 'BK002',
          total_cost_price: '800.00',
          total_selling_price: '1200.00',
          status: 'completed',
          payment_status: 'paid',
          created_by: userId
        }
      ])
      .returning()
      .execute();

    const booking1Id = bookingResults[0].id;
    const booking2Id = bookingResults[1].id;

    // Create test payments
    await db.insert(paymentsTable)
      .values([
        {
          booking_id: booking1Id,
          amount: '500.00',
          currency: 'SAR',
          amount_in_sar: '500.00',
          created_by: userId
        },
        {
          booking_id: booking2Id,
          amount: '1200.00',
          currency: 'SAR',
          amount_in_sar: '1200.00',
          created_by: userId
        }
      ])
      .execute();

    // Create test expenses
    await db.insert(expensesTable)
      .values([
        {
          booking_id: booking1Id,
          expense_name: 'Transportation',
          amount: '100.00',
          created_by: userId
        },
        {
          booking_id: booking2Id,
          expense_name: 'Guide Fee',
          amount: '150.00',
          created_by: userId
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    // Verify customer count
    expect(stats.customer_count).toEqual(2);

    // Verify booking count
    expect(stats.booking_count).toEqual(2);

    // Verify total profit calculation
    // Total selling: 1500 + 1200 = 2700
    // Total cost: 1000 + 800 = 1800
    // Total expenses: 100 + 150 = 250
    // Profit: 2700 - 1800 - 250 = 650
    expect(stats.total_profit).toEqual(650);

    // Verify outstanding payments calculation
    // Total selling: 2700
    // Total payments: 500 + 1200 = 1700
    // Outstanding: 2700 - 1700 = 1000
    expect(stats.outstanding_payments).toEqual(1000);
  });

  it('should handle case with no bookings but customers exist', async () => {
    // Create customers but no bookings
    await db.insert(customersTable)
      .values([
        {
          name: 'Customer 1',
          address: 'Address 1',
          phone: '123456789',
          email: 'customer1@test.com'
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.customer_count).toEqual(1);
    expect(stats.booking_count).toEqual(0);
    expect(stats.total_profit).toEqual(0);
    expect(stats.outstanding_payments).toEqual(0);
  });

  it('should ensure outstanding payments is never negative', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        username: 'testuser',
        password_hash: 'hashed_password',
        role: 'staff'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Customer 1',
        address: 'Address 1',
        phone: '123456789',
        email: 'customer1@test.com'
      })
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    // Create booking with lower selling price
    const bookingResult = await db.insert(bookingsTable)
      .values({
        customer_id: customerId,
        booking_number: 'BK001',
        total_cost_price: '1000.00',
        total_selling_price: '500.00', // Lower than payment
        status: 'confirmed',
        payment_status: 'paid',
        created_by: userId
      })
      .returning()
      .execute();

    // Create payment higher than selling price
    await db.insert(paymentsTable)
      .values({
        booking_id: bookingResult[0].id,
        amount: '800.00',
        currency: 'SAR',
        amount_in_sar: '800.00',
        created_by: userId
      })
      .execute();

    const stats = await getDashboardStats();

    // Outstanding should be 0, not negative
    expect(stats.outstanding_payments).toEqual(0);
  });
});
