import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { seedInitialUsers } from '../handlers/seed';
import { eq } from 'drizzle-orm';

describe('seedInitialUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create admin and staff users', async () => {
    await seedInitialUsers();

    // Check admin user exists
    const adminUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'admin'))
      .execute();

    expect(adminUsers).toHaveLength(1);
    expect(adminUsers[0].name).toEqual('Administrator');
    expect(adminUsers[0].role).toEqual('administrator');
    expect(adminUsers[0].is_active).toBe(true);

    // Check staff user exists
    const staffUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'staff'))
      .execute();

    expect(staffUsers).toHaveLength(1);
    expect(staffUsers[0].name).toEqual('Staff Member');
    expect(staffUsers[0].role).toEqual('staff');
    expect(staffUsers[0].is_active).toBe(true);
  });

  it('should not create duplicate users if they already exist', async () => {
    // Seed initially
    await seedInitialUsers();

    // Seed again
    await seedInitialUsers();

    // Should still only have one admin and one staff user
    const adminUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'admin'))
      .execute();

    const staffUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'staff'))
      .execute();

    expect(adminUsers).toHaveLength(1);
    expect(staffUsers).toHaveLength(1);
  });

  it('should create users with hashed passwords', async () => {
    await seedInitialUsers();

    const adminUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'admin'))
      .execute();

    // Password should be hashed, not plain text
    expect(adminUsers[0].password_hash).not.toEqual('admin');
    expect(adminUsers[0].password_hash.length).toBeGreaterThan(10);

    // Test that the password verifies correctly
    const isValid = await Bun.password.verify('admin', adminUsers[0].password_hash);
    expect(isValid).toBe(true);
  });
});