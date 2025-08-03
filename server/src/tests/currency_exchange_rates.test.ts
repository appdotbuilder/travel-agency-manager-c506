
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { currencyExchangeRatesTable } from '../db/schema';
import { type CreateCurrencyExchangeRateInput, type UpdateCurrencyExchangeRateInput } from '../schema';
import { 
  getCurrencyExchangeRates, 
  createCurrencyExchangeRate, 
  updateCurrencyExchangeRate, 
  deleteCurrencyExchangeRate 
} from '../handlers/currency_exchange_rates';
import { eq, and } from 'drizzle-orm';

describe('Currency Exchange Rates Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getCurrencyExchangeRates', () => {
    it('should return empty array when no rates exist', async () => {
      const result = await getCurrencyExchangeRates();
      expect(result).toEqual([]);
    });

    it('should return all exchange rates with proper numeric conversion', async () => {
      // Create test data
      await db.insert(currencyExchangeRatesTable)
        .values([
          {
            from_currency: 'USD',
            to_currency: 'SAR',
            rate: '3.75'
          },
          {
            from_currency: 'USD',
            to_currency: 'IDR',
            rate: '15000.50'
          }
        ])
        .execute();

      const result = await getCurrencyExchangeRates();

      expect(result).toHaveLength(2);
      expect(result[0].from_currency).toBe('USD');
      expect(result[0].to_currency).toBe('SAR');
      expect(typeof result[0].rate).toBe('number');
      expect(result[0].rate).toBe(3.75);
      expect(result[0].id).toBeDefined();
      expect(result[0].created_at).toBeInstanceOf(Date);
      expect(result[0].updated_at).toBeInstanceOf(Date);
    });
  });

  describe('createCurrencyExchangeRate', () => {
    const validInput: CreateCurrencyExchangeRateInput = {
      from_currency: 'USD',
      to_currency: 'SAR',
      rate: 3.75
    };

    it('should create currency exchange rate successfully', async () => {
      const result = await createCurrencyExchangeRate(validInput);

      expect(result.from_currency).toBe('USD');
      expect(result.to_currency).toBe('SAR');
      expect(result.rate).toBe(3.75);
      expect(typeof result.rate).toBe('number');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save exchange rate to database', async () => {
      const result = await createCurrencyExchangeRate(validInput);

      const saved = await db.select()
        .from(currencyExchangeRatesTable)
        .where(eq(currencyExchangeRatesTable.id, result.id))
        .execute();

      expect(saved).toHaveLength(1);
      expect(saved[0].from_currency).toBe('USD');
      expect(saved[0].to_currency).toBe('SAR');
      expect(parseFloat(saved[0].rate)).toBe(3.75);
    });

    it('should prevent duplicate currency pairs', async () => {
      await createCurrencyExchangeRate(validInput);

      await expect(createCurrencyExchangeRate(validInput))
        .rejects.toThrow(/already exists/i);
    });

    it('should allow same currencies in different directions', async () => {
      await createCurrencyExchangeRate(validInput);

      const reverseInput: CreateCurrencyExchangeRateInput = {
        from_currency: 'SAR',
        to_currency: 'USD',
        rate: 0.267
      };

      const result = await createCurrencyExchangeRate(reverseInput);
      expect(result.from_currency).toBe('SAR');
      expect(result.to_currency).toBe('USD');
      expect(result.rate).toBe(0.267);
    });
  });

  describe('updateCurrencyExchangeRate', () => {
    it('should update existing exchange rate', async () => {
      const created = await createCurrencyExchangeRate({
        from_currency: 'USD',
        to_currency: 'SAR',
        rate: 3.75
      });

      const updateInput: UpdateCurrencyExchangeRateInput = {
        id: created.id,
        rate: 3.80
      };

      const result = await updateCurrencyExchangeRate(updateInput);

      expect(result.id).toBe(created.id);
      expect(result.rate).toBe(3.80);
      expect(typeof result.rate).toBe('number');
      expect(result.from_currency).toBe('USD');
      expect(result.to_currency).toBe('SAR');
      expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
    });

    it('should update rate in database', async () => {
      const created = await createCurrencyExchangeRate({
        from_currency: 'USD',
        to_currency: 'SAR',
        rate: 3.75
      });

      await updateCurrencyExchangeRate({
        id: created.id,
        rate: 3.85
      });

      const updated = await db.select()
        .from(currencyExchangeRatesTable)
        .where(eq(currencyExchangeRatesTable.id, created.id))
        .execute();

      expect(updated).toHaveLength(1);
      expect(parseFloat(updated[0].rate)).toBe(3.85);
    });

    it('should throw error for non-existent exchange rate', async () => {
      const updateInput: UpdateCurrencyExchangeRateInput = {
        id: 999,
        rate: 3.80
      };

      await expect(updateCurrencyExchangeRate(updateInput))
        .rejects.toThrow(/not found/i);
    });
  });

  describe('deleteCurrencyExchangeRate', () => {
    it('should delete existing exchange rate', async () => {
      const created = await createCurrencyExchangeRate({
        from_currency: 'USD',
        to_currency: 'SAR',
        rate: 3.75
      });

      await deleteCurrencyExchangeRate(created.id);

      const deleted = await db.select()
        .from(currencyExchangeRatesTable)
        .where(eq(currencyExchangeRatesTable.id, created.id))
        .execute();

      expect(deleted).toHaveLength(0);
    });

    it('should throw error for non-existent exchange rate', async () => {
      await expect(deleteCurrencyExchangeRate(999))
        .rejects.toThrow(/not found/i);
    });
  });
});
