
import { db } from '../db';
import { companySettingsTable } from '../db/schema';
import { type CompanySettings, type UpdateCompanySettingsInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCompanySettings(): Promise<CompanySettings | null> {
  try {
    const results = await db.select()
      .from(companySettingsTable)
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    const settings = results[0];
    return {
      ...settings,
      // No numeric fields to convert in company settings
    };
  } catch (error) {
    console.error('Failed to fetch company settings:', error);
    throw error;
  }
}

export async function updateCompanySettings(input: UpdateCompanySettingsInput): Promise<CompanySettings> {
  try {
    // Check if settings already exist
    const existing = await getCompanySettings();

    if (existing) {
      // Update existing record
      const results = await db.update(companySettingsTable)
        .set({
          company_name: input.company_name,
          address: input.address,
          phone: input.phone,
          email: input.email,
          tax_number: input.tax_number,
          logo_url: input.logo_url,
          updated_at: new Date()
        })
        .where(eq(companySettingsTable.id, existing.id))
        .returning()
        .execute();

      return results[0];
    } else {
      // Create new record
      const results = await db.insert(companySettingsTable)
        .values({
          company_name: input.company_name,
          address: input.address,
          phone: input.phone,
          email: input.email,
          tax_number: input.tax_number,
          logo_url: input.logo_url
        })
        .returning()
        .execute();

      return results[0];
    }
  } catch (error) {
    console.error('Failed to update company settings:', error);
    throw error;
  }
}
