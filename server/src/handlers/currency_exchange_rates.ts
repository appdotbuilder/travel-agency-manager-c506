
import { db } from '../db';
import { currencyExchangeRatesTable } from '../db/schema';
import { type CurrencyExchangeRate, type CreateCurrencyExchangeRateInput, type UpdateCurrencyExchangeRateInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getCurrencyExchangeRates(): Promise<CurrencyExchangeRate[]> {
  try {
    const results = await db.select()
      .from(currencyExchangeRatesTable)
      .execute();

    return results.map(rate => ({
      ...rate,
      rate: parseFloat(rate.rate) // Convert numeric field back to number
    }));
  } catch (error) {
    console.error('Failed to fetch currency exchange rates:', error);
    throw error;
  }
}

export async function createCurrencyExchangeRate(input: CreateCurrencyExchangeRateInput): Promise<CurrencyExchangeRate> {
  try {
    // Check if exchange rate already exists for this currency pair
    const existing = await db.select()
      .from(currencyExchangeRatesTable)
      .where(
        and(
          eq(currencyExchangeRatesTable.from_currency, input.from_currency),
          eq(currencyExchangeRatesTable.to_currency, input.to_currency)
        )
      )
      .execute();

    if (existing.length > 0) {
      throw new Error(`Exchange rate already exists for ${input.from_currency} to ${input.to_currency}`);
    }

    const result = await db.insert(currencyExchangeRatesTable)
      .values({
        from_currency: input.from_currency,
        to_currency: input.to_currency,
        rate: input.rate.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    const exchangeRate = result[0];
    return {
      ...exchangeRate,
      rate: parseFloat(exchangeRate.rate) // Convert string back to number
    };
  } catch (error) {
    console.error('Currency exchange rate creation failed:', error);
    throw error;
  }
}

export async function updateCurrencyExchangeRate(input: UpdateCurrencyExchangeRateInput): Promise<CurrencyExchangeRate> {
  try {
    const result = await db.update(currencyExchangeRatesTable)
      .set({
        rate: input.rate.toString(), // Convert number to string for numeric column
        updated_at: new Date()
      })
      .where(eq(currencyExchangeRatesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Currency exchange rate with id ${input.id} not found`);
    }

    const exchangeRate = result[0];
    return {
      ...exchangeRate,
      rate: parseFloat(exchangeRate.rate) // Convert string back to number
    };
  } catch (error) {
    console.error('Currency exchange rate update failed:', error);
    throw error;
  }
}

export async function deleteCurrencyExchangeRate(id: number): Promise<void> {
  try {
    const result = await db.delete(currencyExchangeRatesTable)
      .where(eq(currencyExchangeRatesTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Currency exchange rate with id ${id} not found`);
    }
  } catch (error) {
    console.error('Currency exchange rate deletion failed:', error);
    throw error;
  }
}
