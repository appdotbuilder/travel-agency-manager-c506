
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../handlers/users';
import { eq } from 'drizzle-orm';

const testUserInput: CreateUserInput = {
  name: 'Test User',
  username: 'testuser',
  password: 'password123',
  role: 'staff'
};

const testAdminInput: CreateUserInput = {
  name: 'Admin User',
  username: 'admin',
  password: 'admin123',
  role: 'administrator'
};

describe('User Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      const result = await createUser(testUserInput);

      expect(result.name).toEqual('Test User');
      expect(result.username).toEqual('testuser');
      expect(result.role).toEqual('staff');
      expect(result.is_active).toEqual(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toEqual('password123'); // Should be hashed
    });

    it('should save user to database', async () => {
      const result = await createUser(testUserInput);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].name).toEqual('Test User');
      expect(users[0].username).toEqual('testuser');
      expect(users[0].role).toEqual('staff');
      expect(users[0].is_active).toEqual(true);
    });

    it('should create administrator user', async () => {
      const result = await createUser(testAdminInput);

      expect(result.role).toEqual('administrator');
      expect(result.name).toEqual('Admin User');
      expect(result.username).toEqual('admin');
    });

    it('should reject duplicate username', async () => {
      await createUser(testUserInput);

      const duplicateInput: CreateUserInput = {
        name: 'Another User',
        username: 'testuser', // Same username
        password: 'different123',
        role: 'administrator'
      };

      await expect(createUser(duplicateInput)).rejects.toThrow();
    });
  });

  describe('getUsers', () => {
    it('should return empty array when no users exist', async () => {
      const result = await getUsers();
      expect(result).toEqual([]);
    });

    it('should return all users', async () => {
      await createUser(testUserInput);
      await createUser(testAdminInput);

      const result = await getUsers();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('Test User');
      expect(result[1].name).toEqual('Admin User');
      expect(result[0].password_hash).toBeDefined();
      expect(result[1].password_hash).toBeDefined();
    });

    it('should include inactive users', async () => {
      const user = await createUser(testUserInput);
      await deleteUser(user.id); // Soft delete

      const result = await getUsers();

      expect(result).toHaveLength(1);
      expect(result[0].is_active).toEqual(false);
    });
  });

  describe('getUserById', () => {
    it('should return null for non-existent user', async () => {
      const result = await getUserById(999);
      expect(result).toBeNull();
    });

    it('should return user by ID', async () => {
      const createdUser = await createUser(testUserInput);

      const result = await getUserById(createdUser.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdUser.id);
      expect(result!.name).toEqual('Test User');
      expect(result!.username).toEqual('testuser');
      expect(result!.role).toEqual('staff');
      expect(result!.password_hash).toBeDefined();
    });

    it('should return inactive user', async () => {
      const user = await createUser(testUserInput);
      await deleteUser(user.id);

      const result = await getUserById(user.id);

      expect(result).not.toBeNull();
      expect(result!.is_active).toEqual(false);
    });
  });

  describe('updateUser', () => {
    it('should update user name only', async () => {
      const user = await createUser(testUserInput);

      const updateInput: UpdateUserInput = {
        id: user.id,
        name: 'Updated Name'
      };

      const result = await updateUser(updateInput);

      expect(result.name).toEqual('Updated Name');
      expect(result.username).toEqual('testuser'); // Unchanged
      expect(result.role).toEqual('staff'); // Unchanged
      expect(result.is_active).toEqual(true); // Unchanged
      expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
    });

    it('should update multiple fields', async () => {
      const user = await createUser(testUserInput);

      const updateInput: UpdateUserInput = {
        id: user.id,
        name: 'New Name',
        username: 'newusername',
        role: 'administrator',
        is_active: false
      };

      const result = await updateUser(updateInput);

      expect(result.name).toEqual('New Name');
      expect(result.username).toEqual('newusername');
      expect(result.role).toEqual('administrator');
      expect(result.is_active).toEqual(false);
    });

    it('should update password with new hash', async () => {
      const user = await createUser(testUserInput);
      const originalPasswordHash = user.password_hash;

      const updateInput: UpdateUserInput = {
        id: user.id,
        password: 'newpassword123'
      };

      const result = await updateUser(updateInput);

      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toEqual(originalPasswordHash);
      expect(result.password_hash).not.toEqual('newpassword123'); // Should be hashed
    });

    it('should throw error for non-existent user', async () => {
      const updateInput: UpdateUserInput = {
        id: 999,
        name: 'Non-existent'
      };

      await expect(updateUser(updateInput)).rejects.toThrow(/user not found/i);
    });

    it('should reject duplicate username on update', async () => {
      const user1 = await createUser(testUserInput);
      const user2 = await createUser(testAdminInput);

      const updateInput: UpdateUserInput = {
        id: user2.id,
        username: 'testuser' // Same as user1
      };

      await expect(updateUser(updateInput)).rejects.toThrow();
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user by setting is_active to false', async () => {
      const user = await createUser(testUserInput);

      await deleteUser(user.id);

      const updatedUser = await getUserById(user.id);
      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.is_active).toEqual(false);
      expect(updatedUser!.updated_at.getTime()).toBeGreaterThan(updatedUser!.created_at.getTime());
    });

    it('should throw error for non-existent user', async () => {
      await expect(deleteUser(999)).rejects.toThrow(/user not found/i);
    });

    it('should allow deleting already inactive user', async () => {
      const user = await createUser(testUserInput);
      await deleteUser(user.id); // First deletion

      // Second deletion should not throw
      await deleteUser(user.id);

      const result = await getUserById(user.id);
      expect(result!.is_active).toEqual(false);
    });
  });
});
