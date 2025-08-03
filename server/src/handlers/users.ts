
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User, type CreateUserInput, type UpdateUserInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUsers(): Promise<User[]> {
  try {
    const results = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      username: usersTable.username,
      password_hash: usersTable.password_hash,
      role: usersTable.role,
      is_active: usersTable.is_active,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(usersTable)
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const results = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      username: usersTable.username,
      password_hash: usersTable.password_hash,
      role: usersTable.role,
      is_active: usersTable.is_active,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch user by ID:', error);
    throw error;
  }
}

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Hash the password using Bun's built-in password hashing
    const password_hash = await Bun.password.hash(input.password);

    const results = await db.insert(usersTable)
      .values({
        name: input.name,
        username: input.username,
        password_hash: password_hash,
        role: input.role
      })
      .returning()
      .execute();

    return results[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

export async function updateUser(input: UpdateUserInput): Promise<User> {
  try {
    const updateData: any = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.username !== undefined) {
      updateData.username = input.username;
    }
    if (input.password !== undefined) {
      updateData.password_hash = await Bun.password.hash(input.password);
    }
    if (input.role !== undefined) {
      updateData.role = input.role;
    }
    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    const results = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    if (results.length === 0) {
      throw new Error('User not found');
    }

    return results[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
}

export async function deleteUser(id: number): Promise<void> {
  try {
    const results = await db.update(usersTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id })
      .execute();

    if (results.length === 0) {
      throw new Error('User not found');
    }
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
}
