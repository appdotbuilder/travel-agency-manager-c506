
import { db } from '../db';
import { customersTable, bookingsTable, paymentsTable, expensesTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { count, sum, sql } from 'drizzle-orm';

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Count total customers
    const customerCountResult = await db.select({ count: count() })
      .from(customersTable)
      .execute();
    const customer_count = customerCountResult[0]?.count || 0;

    // Count total bookings
    const bookingCountResult = await db.select({ count: count() })
      .from(bookingsTable)
      .execute();
    const booking_count = bookingCountResult[0]?.count || 0;

    // Calculate total profit (total selling price - total cost price - total expenses)
    const profitResult = await db.select({
      total_selling_price: sum(bookingsTable.total_selling_price),
      total_cost_price: sum(bookingsTable.total_cost_price)
    })
      .from(bookingsTable)
      .execute();

    const totalSellingPrice = parseFloat(profitResult[0]?.total_selling_price || '0');
    const totalCostPrice = parseFloat(profitResult[0]?.total_cost_price || '0');

    // Calculate total expenses
    const expensesResult = await db.select({
      total_expenses: sum(expensesTable.amount)
    })
      .from(expensesTable)
      .execute();

    const totalExpenses = parseFloat(expensesResult[0]?.total_expenses || '0');

    // Calculate profit
    const total_profit = totalSellingPrice - totalCostPrice - totalExpenses;

    // Calculate outstanding payments (total selling price - total payments in SAR)
    const paymentsResult = await db.select({
      total_payments: sum(paymentsTable.amount_in_sar)
    })
      .from(paymentsTable)
      .execute();

    const totalPayments = parseFloat(paymentsResult[0]?.total_payments || '0');
    const outstanding_payments = totalSellingPrice - totalPayments;

    return {
      customer_count,
      booking_count,
      total_profit,
      outstanding_payments: Math.max(0, outstanding_payments) // Ensure non-negative
    };
  } catch (error) {
    console.error('Dashboard stats calculation failed:', error);
    throw error;
  }
}
