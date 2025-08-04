
import { db } from '../db';
import { paymentsTable, bookingsTable, currencyExchangeRatesTable, customersTable, usersTable, companySettingsTable } from '../db/schema';
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
  try {
    // Fetch payment with joins to get related data
    const paymentResults = await db.select({
      payment: paymentsTable,
      booking: bookingsTable,
      customer: customersTable,
      createdBy: usersTable
    })
    .from(paymentsTable)
    .innerJoin(bookingsTable, eq(paymentsTable.booking_id, bookingsTable.id))
    .innerJoin(customersTable, eq(bookingsTable.customer_id, customersTable.id))
    .innerJoin(usersTable, eq(paymentsTable.created_by, usersTable.id))
    .where(eq(paymentsTable.id, paymentId))
    .execute();

    if (paymentResults.length === 0) {
      throw new Error('Payment not found');
    }

    const paymentData = paymentResults[0];
    const { payment, booking, customer, createdBy } = paymentData;

    // Get company settings
    const companyResults = await db.select()
      .from(companySettingsTable)
      .execute();
    
    const companySettings = companyResults[0];

    let receiptContent = `
********************************************************************************
                          PAYMENT RECEIPT - ${companySettings?.company_name || 'Travel Agency'}
********************************************************************************
Receipt ID: ${paymentId}
Date: ${payment.payment_date.toLocaleDateString('en-US')}
Recorded By: ${createdBy.name} (${createdBy.role})

Customer Details:
-----------------
Name: ${customer.name}
Email: ${customer.email}
Phone: ${customer.phone}

Payment Details:
----------------
Booking Number: ${booking.booking_number}
Amount Paid:    ${payment.currency} ${parseFloat(payment.amount).toFixed(2)}
Amount in SAR:  SAR ${parseFloat(payment.amount_in_sar).toFixed(2)}
Notes:          ${payment.notes || 'N/A'}

Company Information:
--------------------
Name: ${companySettings?.company_name || 'N/A'}
Address: ${companySettings?.address || 'N/A'}
Phone: ${companySettings?.phone || 'N/A'}
Email: ${companySettings?.email || 'N/A'}
Tax Number: ${companySettings?.tax_number || 'N/A'}
********************************************************************************
`;

    return Buffer.from(receiptContent, 'utf-8');
  } catch (error) {
    console.error('Generate payment receipt failed:', error);
    throw error;
  }
}
