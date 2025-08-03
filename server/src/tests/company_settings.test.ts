
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { companySettingsTable } from '../db/schema';
import { type UpdateCompanySettingsInput } from '../schema';
import { getCompanySettings, updateCompanySettings } from '../handlers/company_settings';
import { eq } from 'drizzle-orm';

const testInput: UpdateCompanySettingsInput = {
  company_name: 'Test Travel Agency',
  address: '123 Test Street, Test City',
  phone: '+966-123-456789',
  email: 'test@travelagency.com',
  tax_number: 'TAX123456',
  logo_url: 'https://example.com/logo.png'
};

describe('Company Settings Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getCompanySettings', () => {
    it('should return null when no settings exist', async () => {
      const result = await getCompanySettings();
      expect(result).toBeNull();
    });

    it('should return company settings when they exist', async () => {
      // Create settings directly in database
      await db.insert(companySettingsTable)
        .values(testInput)
        .execute();

      const result = await getCompanySettings();

      expect(result).not.toBeNull();
      expect(result!.company_name).toEqual('Test Travel Agency');
      expect(result!.address).toEqual(testInput.address);
      expect(result!.phone).toEqual(testInput.phone);
      expect(result!.email).toEqual(testInput.email);
      expect(result!.tax_number).toEqual(testInput.tax_number);
      expect(result!.logo_url).toEqual(testInput.logo_url);
      expect(result!.id).toBeDefined();
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('updateCompanySettings', () => {
    it('should create new settings when none exist', async () => {
      const result = await updateCompanySettings(testInput);

      expect(result.company_name).toEqual('Test Travel Agency');
      expect(result.address).toEqual(testInput.address);
      expect(result.phone).toEqual(testInput.phone);
      expect(result.email).toEqual(testInput.email);
      expect(result.tax_number).toEqual(testInput.tax_number);
      expect(result.logo_url).toEqual(testInput.logo_url);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);

      // Verify record was saved to database
      const dbRecord = await db.select()
        .from(companySettingsTable)
        .where(eq(companySettingsTable.id, result.id))
        .execute();

      expect(dbRecord).toHaveLength(1);
      expect(dbRecord[0].company_name).toEqual('Test Travel Agency');
    });

    it('should update existing settings', async () => {
      // Create initial settings
      const initial = await updateCompanySettings(testInput);

      // Update with new data
      const updateInput: UpdateCompanySettingsInput = {
        company_name: 'Updated Travel Agency',
        address: '456 Updated Street',
        phone: '+966-987-654321',
        email: 'updated@travelagency.com',
        tax_number: 'UPDATED123',
        logo_url: 'https://example.com/updated-logo.png'
      };

      const result = await updateCompanySettings(updateInput);

      expect(result.id).toEqual(initial.id); // Same ID
      expect(result.company_name).toEqual('Updated Travel Agency');
      expect(result.address).toEqual(updateInput.address);
      expect(result.phone).toEqual(updateInput.phone);
      expect(result.email).toEqual(updateInput.email);
      expect(result.tax_number).toEqual(updateInput.tax_number);
      expect(result.logo_url).toEqual(updateInput.logo_url);
      expect(result.updated_at.getTime()).toBeGreaterThan(initial.updated_at.getTime());

      // Verify only one record exists
      const allRecords = await db.select()
        .from(companySettingsTable)
        .execute();

      expect(allRecords).toHaveLength(1);
      expect(allRecords[0].company_name).toEqual('Updated Travel Agency');
    });

    it('should handle nullable fields correctly', async () => {
      const inputWithNulls: UpdateCompanySettingsInput = {
        company_name: 'Test Agency',
        address: 'Test Address',
        phone: '123456789',
        email: 'test@example.com',
        tax_number: null,
        logo_url: null
      };

      const result = await updateCompanySettings(inputWithNulls);

      expect(result.tax_number).toBeNull();
      expect(result.logo_url).toBeNull();
      expect(result.company_name).toEqual('Test Agency');

      // Verify in database
      const dbRecord = await db.select()
        .from(companySettingsTable)
        .where(eq(companySettingsTable.id, result.id))
        .execute();

      expect(dbRecord[0].tax_number).toBeNull();
      expect(dbRecord[0].logo_url).toBeNull();
    });
  });
});
