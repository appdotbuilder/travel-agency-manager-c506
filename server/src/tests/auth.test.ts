
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login, verifyToken } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  name: 'Test User',
  username: 'testuser',
  password_hash: 'testpassword123', // In real app, this would be hashed
  role: 'administrator' as const,
  is_active: true
};

const testLoginInput: LoginInput = {
  username: 'testuser',
  password: 'testpassword123'
};

describe('auth handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('login', () => {
    beforeEach(async () => {
      // Create test user
      await db.insert(usersTable)
        .values(testUser)
        .execute();
    });

    it('should authenticate valid user', async () => {
      const result = await login(testLoginInput);

      // Verify user data
      expect(result.user.name).toEqual('Test User');
      expect(result.user.username).toEqual('testuser');
      expect(result.user.role).toEqual('administrator');
      expect(result.user.is_active).toBe(true);
      expect(result.user.id).toBeDefined();
      expect(result.user.created_at).toBeInstanceOf(Date);

      // Verify token
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token.split('.').length).toBe(3); // JWT-like format

      // Verify token payload can be decoded
      const tokenParts = result.token.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      expect(payload.userId).toEqual(result.user.id);
      expect(payload.username).toEqual('testuser');
      expect(payload.role).toEqual('administrator');
      expect(payload.exp).toBeDefined();
    });

    it('should reject invalid username', async () => {
      const invalidInput: LoginInput = {
        username: 'nonexistent',
        password: 'testpassword123'
      };

      await expect(login(invalidInput)).rejects.toThrow(/invalid username or password/i);
    });

    it('should reject invalid password', async () => {
      const invalidInput: LoginInput = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      await expect(login(invalidInput)).rejects.toThrow(/invalid username or password/i);
    });

    it('should reject inactive user', async () => {
      // Create inactive user
      await db.insert(usersTable)
        .values({
          ...testUser,
          username: 'inactiveuser',
          is_active: false
        })
        .execute();

      const inactiveInput: LoginInput = {
        username: 'inactiveuser',
        password: 'testpassword123'
      };

      await expect(login(inactiveInput)).rejects.toThrow(/user account is inactive/i);
    });
  });

  describe('verifyToken', () => {
    let validToken: string;
    let userId: number;

    beforeEach(async () => {
      // Create test user and get valid token
      const users = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();
      
      userId = users[0].id;

      const loginResult = await login(testLoginInput);
      validToken = loginResult.token;
    });

    it('should verify valid token', async () => {
      const user = await verifyToken(validToken);

      expect(user).not.toBeNull();
      expect(user!.id).toEqual(userId);
      expect(user!.name).toEqual('Test User');
      expect(user!.username).toEqual('testuser');
      expect(user!.role).toEqual('administrator');
      expect(user!.is_active).toBe(true);
      expect(user!.created_at).toBeInstanceOf(Date);
    });

    it('should reject invalid token', async () => {
      const invalidToken = 'invalid.token.here';
      
      const user = await verifyToken(invalidToken);
      expect(user).toBeNull();
    });

    it('should reject token for nonexistent user', async () => {
      // Delete the user but token still exists
      await db.delete(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      const user = await verifyToken(validToken);
      expect(user).toBeNull();
    });

    it('should reject token for inactive user', async () => {
      // Deactivate the user
      await db.update(usersTable)
        .set({ is_active: false })
        .where(eq(usersTable.id, userId))
        .execute();

      const user = await verifyToken(validToken);
      expect(user).toBeNull();
    });

    it('should return null for empty token', async () => {
      const user = await verifyToken('');
      expect(user).toBeNull();
    });

    it('should reject malformed token', async () => {
      const malformedToken = 'not.a.valid.jwt.token';
      
      const user = await verifyToken(malformedToken);
      expect(user).toBeNull();
    });
  });
});
