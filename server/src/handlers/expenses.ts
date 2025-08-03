
import { db } from '../db';
import { expensesTable, bookingsTable } from '../db/schema';
import { type Expense, type CreateExpenseInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function getExpensesByBookingId(bookingId: number): Promise<Expense[]> {
  try {
    const results = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.booking_id, bookingId))
      .execute();

    return results.map(expense => ({
      ...expense,
      amount: parseFloat(expense.amount) // Convert numeric to number
    }));
  } catch (error) {
    console.error('Failed to fetch expenses by booking ID:', error);
    throw error;
  }
}

export async function createExpense(input: CreateExpenseInput, userId: number): Promise<Expense> {
  try {
    // Verify booking exists before creating expense
    const bookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, input.booking_id))
      .execute();

    if (bookings.length === 0) {
      throw new Error(`Booking with ID ${input.booking_id} not found`);
    }

    // Insert expense record
    const result = await db.insert(expensesTable)
      .values({
        booking_id: input.booking_id,
        expense_name: input.expense_name,
        amount: input.amount.toString(), // Convert number to string for numeric column
        created_by: userId
      })
      .returning()
      .execute();

    const expense = result[0];
    return {
      ...expense,
      amount: parseFloat(expense.amount) // Convert numeric back to number
    };
  } catch (error) {
    console.error('Expense creation failed:', error);
    throw error;
  }
}
