
import { db } from '../db';
import { customersTable, bookingsTable } from '../db/schema';
import { type Customer, type CreateCustomerInput, type UpdateCustomerInput } from '../schema';
import { eq, count } from 'drizzle-orm';

export async function getCustomers(): Promise<Customer[]> {
  try {
    const results = await db.select()
      .from(customersTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    throw error;
  }
}

export async function getCustomerById(id: number): Promise<Customer | null> {
  try {
    const results = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, id))
      .execute();

    return results[0] || null;
  } catch (error) {
    console.error('Failed to fetch customer by ID:', error);
    throw error;
  }
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  try {
    const result = await db.insert(customersTable)
      .values({
        name: input.name,
        address: input.address,
        phone: input.phone,
        email: input.email
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Customer creation failed:', error);
    throw error;
  }
}

export async function updateCustomer(input: UpdateCustomerInput): Promise<Customer> {
  try {
    // Build update object with only provided fields
    const updateData: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at'>> = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.email = input.email;

    const result = await db.update(customersTable)
      .set(updateData)
      .where(eq(customersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Customer with ID ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Customer update failed:', error);
    throw error;
  }
}

export async function deleteCustomer(id: number): Promise<void> {
  try {
    // Check if customer has any bookings
    const bookingCount = await db.select({ count: count() })
      .from(bookingsTable)
      .where(eq(bookingsTable.customer_id, id))
      .execute();

    if (bookingCount[0].count > 0) {
      throw new Error('Cannot delete customer with existing bookings');
    }

    const result = await db.delete(customersTable)
      .where(eq(customersTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Customer with ID ${id} not found`);
    }
  } catch (error) {
    console.error('Customer deletion failed:', error);
    throw error;
  }
}
