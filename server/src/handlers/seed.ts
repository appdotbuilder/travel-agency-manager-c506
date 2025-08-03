import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createUser } from './users';

export async function seedInitialUsers(): Promise<void> {
  try {
    // Check if admin user exists
    const adminUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'admin'))
      .execute();

    if (adminUser.length === 0) {
      console.log('Seeding initial admin user (admin/admin)...');
      await createUser({
        name: 'Administrator',
        username: 'admin',
        password: 'admin', // This will be hashed by createUser
        role: 'administrator'
      });
    }

    // Check if staff user exists
    const staffUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'staff'))
      .execute();

    if (staffUser.length === 0) {
      console.log('Seeding initial staff user (staff/staff)...');
      await createUser({
        name: 'Staff Member',
        username: 'staff',
        password: 'staff', // This will be hashed by createUser
        role: 'staff'
      });
    }

    console.log('Initial users seeding complete.');
  } catch (error) {
    console.error('Failed to seed initial users:', error);
    throw error;
  }
}