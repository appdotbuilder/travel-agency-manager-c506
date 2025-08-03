
import { db } from '../db';
import { paymentsTable, bookingsTable, currencyExchangeRatesTable } from '../db/schema';
import { type CreatePaymentInput, type Payment } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getPaymentsByBookingId(bookingId: number): Promise<Payment[]> {
  try {
    const results = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.booking_id, bookingId))
      .execute();

    return results.map(payment => ({
      ...payment,
      amount: parseFloat(payment.amount),
      amount_in_sar: parseFloat(payment.amount_in_sar)
    }));
  } catch (error) {
    console.error('Failed to get payments by booking ID:', error);
    throw error;
  }
}

export async function createPayment(input: CreatePaymentInput, userId: number): Promise<Payment> {
  try {
    // Verify booking exists
    const booking = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, input.booking_id))
      .execute();

    if (booking.length === 0) {
      throw new Error('Booking not found');
    }

    // Convert amount to SAR if needed
    let amountInSar = input.amount;
    if (input.currency !== 'SAR') {
      const exchangeRate = await db.select()
        .from(currencyExchangeRatesTable)
        .where(
          and(
            eq(currencyExchangeRatesTable.from_currency, input.currency),
            eq(currencyExchangeRatesTable.to_currency, 'SAR')
          )
        )
        .execute();

      if (exchangeRate.length === 0) {
        throw new Error(`Exchange rate not found for ${input.currency} to SAR`);
      }

      amountInSar = input.amount * parseFloat(exchangeRate[0].rate);
    }

    // Create payment record
    const result = await db.insert(paymentsTable)
      .values({
        booking_id: input.booking_id,
        amount: input.amount.toString(),
        currency: input.currency,
        amount_in_sar: amountInSar.toString(),
        notes: input.notes,
        created_by: userId
      })
      .returning()
      .execute();

    const payment = result[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount),
      amount_in_sar: parseFloat(payment.amount_in_sar)
    };
  } catch (error) {
    console.error('Payment creation failed:', error);
    throw error;
  }
}

export async function generatePaymentReceipt(paymentId: number): Promise<Buffer> {
  // This is a placeholder declaration! Real code should be implemented here.
  // The goal of this handler is to generate PDF receipt for a payment.
  return Promise.resolve(Buffer.from('PDF receipt placeholder'));
}
