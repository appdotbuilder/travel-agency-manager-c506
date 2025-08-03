
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, hotelsTable } from '../db/schema';
import { createDatabaseBackup, restoreDatabase } from '../handlers/database_backup';

// Set test environment
process.env['BUN_ENV'] = 'test';

describe('database backup and restore', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createDatabaseBackup', () => {
    it('should create a non-empty backup', async () => {
      const backup = await createDatabaseBackup();

      expect(backup).toBeInstanceOf(Buffer);
      expect(backup.length).toBeGreaterThan(0);
    });

    it('should create backup containing SQL commands', async () => {
      const backup = await createDatabaseBackup();
      const backupContent = backup.toString('utf8');

      // Should contain PostgreSQL dump header
      expect(backupContent).toMatch(/PostgreSQL/i);
      
      // Should contain schema creation commands
      expect(backupContent).toMatch(/CREATE/i);
      
      // Should contain DROP statements
      expect(backupContent).toMatch(/DROP/i);
    });

    it('should create backup with data when tables have records', async () => {
      // Insert test data
      await db.insert(customersTable).values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '+1234567890',
        email: 'test@example.com'
      }).execute();

      await db.insert(hotelsTable).values({
        name: 'Test Hotel',
        location: 'Test City',
        cost_price: '100.00',
        selling_price_percentage: '20.00'
      }).execute();

      const backup = await createDatabaseBackup();
      const backupContent = backup.toString('utf8');

      // Should contain INSERT statements for our data
      expect(backupContent).toMatch(/INSERT INTO/i);
      expect(backupContent).toMatch(/Test Customer/);
      expect(backupContent).toMatch(/Test Hotel/);
    });

    it('should create backup even when tables are empty', async () => {
      const backup = await createDatabaseBackup();
      const backupContent = backup.toString('utf8');

      // Should still contain PostgreSQL header and schema commands
      expect(backupContent).toMatch(/PostgreSQL/i);
      expect(backupContent).toMatch(/CREATE/i);
      expect(backup.length).toBeGreaterThan(100); // Should have meaningful content
    });
  });

  describe('restoreDatabase', () => {
    it('should reject empty backup file', async () => {
      const emptyBuffer = Buffer.from('');

      await expect(restoreDatabase(emptyBuffer)).rejects.toThrow(/empty/i);
    });

    it('should reject invalid backup file format', async () => {
      const invalidBuffer = Buffer.from('This is not a SQL backup file');

      await expect(restoreDatabase(invalidBuffer)).rejects.toThrow(/invalid.*format/i);
    });

    it('should accept valid SQL backup format with schema marker', async () => {
      const validBackup = Buffer.from(`
        -- PostgreSQL database dump
        CREATE SCHEMA public;
        -- SCHEMA_RECREATION_MARKER
      `);

      // Should not throw for valid format
      await expect(restoreDatabase(validBackup)).resolves.toBeUndefined();
    });

    it('should accept valid SQL backup format without schema marker', async () => {
      const validBackup = Buffer.from(`
        -- PostgreSQL database dump
        CREATE TABLE test (id int);
      `);

      // Should not throw for valid format
      await expect(restoreDatabase(validBackup)).resolves.toBeUndefined();
    });

    it('should successfully restore from valid backup', async () => {
      // Create initial data
      await db.insert(customersTable).values({
        name: 'Original Customer',
        address: '456 Original St',
        phone: '+9876543210',
        email: 'original@example.com'
      }).execute();

      // Create backup
      const backup = await createDatabaseBackup();

      // Clear database and add different data
      await resetDB();
      await createDB();
      
      await db.insert(customersTable).values({
        name: 'Different Customer',
        address: '789 Different St',
        phone: '+1111111111',
        email: 'different@example.com'
      }).execute();

      // Verify different data exists
      const beforeRestore = await db.select().from(customersTable).execute();
      expect(beforeRestore).toHaveLength(1);
      expect(beforeRestore[0].name).toBe('Different Customer');

      // Restore from backup
      await restoreDatabase(backup);

      // Verify original data is restored (should now have both records)
      const afterRestore = await db.select().from(customersTable).execute();
      expect(afterRestore.length).toBeGreaterThanOrEqual(1);
      
      // Check if original customer exists
      const originalCustomer = afterRestore.find(c => c.name === 'Original Customer');
      expect(originalCustomer).toBeDefined();
      expect(originalCustomer?.email).toBe('original@example.com');
    });

    it('should restore database schema correctly', async () => {
      // Create backup of clean schema
      const backup = await createDatabaseBackup();

      // Drop schema completely
      await resetDB();

      // Restore from backup should not fail and should recreate schema
      await expect(restoreDatabase(backup)).resolves.toBeUndefined();

      // Verify schema exists by trying to insert data
      const result = await db.insert(customersTable).values({
        name: 'Schema Test Customer',
        address: '999 Schema St',
        phone: '+5555555555',
        email: 'schema@example.com'
      }).returning().execute();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Schema Test Customer');
    });
  });

  describe('backup and restore integration', () => {
    it('should maintain data integrity through backup and restore cycle', async () => {
      // Create comprehensive test data
      await db.insert(customersTable).values({
        name: 'Integration Customer',
        address: '123 Integration Ave',
        phone: '+1234567890',
        email: 'integration@example.com'
      }).execute();

      await db.insert(hotelsTable).values({
        name: 'Integration Hotel',
        location: 'Integration City',
        cost_price: '150.50',
        selling_price_percentage: '25.75'
      }).execute();

      // Create backup
      const backup = await createDatabaseBackup();

      // Verify backup contains our data
      const backupContent = backup.toString('utf8');
      expect(backupContent).toMatch(/Integration Customer/);
      expect(backupContent).toMatch(/Integration Hotel/);

      // Clear and restore
      await resetDB();
      await restoreDatabase(backup);

      // Verify data is restored
      const customers = await db.select().from(customersTable).execute();
      const hotels = await db.select().from(hotelsTable).execute();

      // Should have at least one customer and hotel
      expect(customers.length).toBeGreaterThanOrEqual(1);
      expect(hotels.length).toBeGreaterThanOrEqual(1);

      // Find our specific records
      const integrationCustomer = customers.find(c => c.name === 'Integration Customer');
      const integrationHotel = hotels.find(h => h.name === 'Integration Hotel');

      expect(integrationCustomer).toBeDefined();
      expect(integrationCustomer?.email).toBe('integration@example.com');
      
      expect(integrationHotel).toBeDefined();
      expect(parseFloat(integrationHotel?.cost_price || '0')).toBe(150.50);
      expect(parseFloat(integrationHotel?.selling_price_percentage || '0')).toBe(25.75);
    });

    it('should handle multiple backup and restore cycles', async () => {
      // First cycle
      await db.insert(customersTable).values({
        name: 'Cycle 1 Customer',
        address: '111 First St',
        phone: '+1111111111',
        email: 'cycle1@example.com'
      }).execute();

      const backup1 = await createDatabaseBackup();
      
      // Second cycle - add more data
      await db.insert(customersTable).values({
        name: 'Cycle 2 Customer',
        address: '222 Second St',
        phone: '+2222222222',
        email: 'cycle2@example.com'
      }).execute();

      const backup2 = await createDatabaseBackup();

      // Restore first backup
      await resetDB();
      await restoreDatabase(backup1);

      const afterFirstRestore = await db.select().from(customersTable).execute();
      expect(afterFirstRestore.find(c => c.name === 'Cycle 1 Customer')).toBeDefined();
      expect(afterFirstRestore.find(c => c.name === 'Cycle 2 Customer')).toBeUndefined();

      // Restore second backup
      await resetDB();
      await restoreDatabase(backup2);

      const afterSecondRestore = await db.select().from(customersTable).execute();
      expect(afterSecondRestore.find(c => c.name === 'Cycle 1 Customer')).toBeDefined();
      expect(afterSecondRestore.find(c => c.name === 'Cycle 2 Customer')).toBeDefined();
    });
  });
});
