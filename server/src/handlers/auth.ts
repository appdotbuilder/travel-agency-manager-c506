
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

// Simple JWT implementation without external dependencies
const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';

// Simple base64 encoding/decoding for JWT-like tokens
function createToken(payload: any): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Date.now();
  const tokenPayload = { ...payload, exp: now + 24 * 60 * 60 * 1000 }; // 24h expiry
  
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(tokenPayload));
  const signature = btoa(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyTokenString(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, signature] = parts;
    
    // Verify signature
    const expectedSignature = btoa(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`);
    if (signature !== expectedSignature) return null;
    
    // Decode payload
    const payload = JSON.parse(atob(encodedPayload));
    
    // Check expiry
    if (payload.exp && Date.now() > payload.exp) return null;
    
    return payload;
  } catch (error) {
    return null;
  }
}

export async function login(input: LoginInput): Promise<{ user: User; token: string }> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('User account is inactive');
    }

    // Verify password (in real implementation, use bcrypt.compare)
    // For now, we'll do a simple string comparison
    if (user.password_hash !== input.password) {
      throw new Error('Invalid username or password');
    }

    // Generate token
    const token = createToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // Return user data
    const userResponse: User = {
      id: user.id,
      name: user.name,
      username: user.username,
      password_hash: user.password_hash,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    return { user: userResponse, token };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    // Verify token
    const decoded = verifyTokenString(token);
    if (!decoded || !decoded.userId) {
      return null;
    }

    // Find user by ID to get fresh data
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId))
      .execute();

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // Check if user is still active
    if (!user.is_active) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      password_hash: user.password_hash,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
