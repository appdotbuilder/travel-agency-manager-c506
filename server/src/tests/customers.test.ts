
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, bookingsTable, usersTable } from '../db/schema';
import { type CreateCustomerInput, type UpdateCustomerInput } from '../schema';
import { 
  getCustomers, 
  getCustomerById, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer 
} from '../handlers/customers';
import { eq } from 'drizzle-orm';

const testCustomerInput: CreateCustomerInput = {
  name: 'John Doe',
  address: '123 Main St, City, Country',
  phone: '+1-555-0123',
  email: 'john.doe@example.com'
};

const secondCustomerInput: CreateCustomerInput = {
  name: 'Jane Smith',
  address: '456 Oak Ave, Town, Country',
  phone: '+1-555-0456',
  email: 'jane.smith@example.com'
};

describe('Customer Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createCustomer', () => {
    it('should create a customer', async () => {
      const result = await createCustomer(testCustomerInput);

      expect(result.name).toEqual('John Doe');
      expect(result.address).toEqual(testCustomerInput.address);
      expect(result.phone).toEqual(testCustomerInput.phone);
      expect(result.email).toEqual(testCustomerInput.email);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save customer to database', async () => {
      const result = await createCustomer(testCustomerInput);

      const customers = await db.select()
        .from(customersTable)
        .where(eq(customersTable.id, result.id))
        .execute();

      expect(customers).toHaveLength(1);
      expect(customers[0].name).toEqual('John Doe');
      expect(customers[0].email).toEqual(testCustomerInput.email);
      expect(customers[0].created_at).toBeInstanceOf(Date);
    });
  });

  describe('getCustomers', () => {
    it('should return empty array when no customers exist', async () => {
      const result = await getCustomers();
      expect(result).toEqual([]);
    });

    it('should return all customers', async () => {
      await createCustomer(testCustomerInput);
      await createCustomer(secondCustomerInput);

      const result = await getCustomers();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('John Doe');
      expect(result[1].name).toEqual('Jane Smith');
      expect(result[0].created_at).toBeInstanceOf(Date);
      expect(result[1].created_at).toBeInstanceOf(Date);
    });
  });

  describe('getCustomerById', () => {
    it('should return null when customer does not exist', async () => {
      const result = await getCustomerById(999);
      expect(result).toBeNull();
    });

    it('should return customer when found', async () => {
      const created = await createCustomer(testCustomerInput);

      const result = await getCustomerById(created.id);

      expect(result).not.toBeNull();
      expect(result!.name).toEqual('John Doe');
      expect(result!.email).toEqual(testCustomerInput.email);
      expect(result!.id).toEqual(created.id);
      expect(result!.created_at).toBeInstanceOf(Date);
    });
  });

  describe('updateCustomer', () => {
    it('should update customer fields', async () => {
      const created = await createCustomer(testCustomerInput);

      const updateInput: UpdateCustomerInput = {
        id: created.id,
        name: 'John Updated',
        email: 'john.updated@example.com'
      };

      const result = await updateCustomer(updateInput);

      expect(result.name).toEqual('John Updated');
      expect(result.email).toEqual('john.updated@example.com');
      expect(result.address).toEqual(testCustomerInput.address); // Unchanged
      expect(result.phone).toEqual(testCustomerInput.phone); // Unchanged
      expect(result.id).toEqual(created.id);
    });

    it('should update customer in database', async () => {
      const created = await createCustomer(testCustomerInput);

      const updateInput: UpdateCustomerInput = {
        id: created.id,
        name: 'John Updated'
      };

      await updateCustomer(updateInput);

      const customer = await db.select()
        .from(customersTable)
        .where(eq(customersTable.id, created.id))
        .execute();

      expect(customer[0].name).toEqual('John Updated');
      expect(customer[0].email).toEqual(testCustomerInput.email); // Unchanged
    });

    it('should throw error when customer not found', async () => {
      const updateInput: UpdateCustomerInput = {
        id: 999,
        name: 'Non-existent'
      };

      await expect(updateCustomer(updateInput)).rejects.toThrow(/Customer with ID 999 not found/i);
    });
  });

  describe('deleteCustomer', () => {
    it('should delete customer', async () => {
      const created = await createCustomer(testCustomerInput);

      await deleteCustomer(created.id);

      const customers = await db.select()
        .from(customersTable)
        .where(eq(customersTable.id, created.id))
        .execute();

      expect(customers).toHaveLength(0);
    });

    it('should throw error when customer not found', async () => {
      await expect(deleteCustomer(999)).rejects.toThrow(/Customer with ID 999 not found/i);
    });

    it('should prevent deletion when customer has bookings', async () => {
      // Create prerequisite data
      const customer = await createCustomer(testCustomerInput);
      
      const user = await db.insert(usersTable)
        .values({
          name: 'Test User',
          username: 'testuser',
          password_hash: 'hashedpassword',
          role: 'staff'
        })
        .returning()
        .execute();

      // Create a booking for the customer
      await db.insert(bookingsTable)
        .values({
          customer_id: customer.id,
          booking_number: 'BK001',
          total_cost_price: '100.00',
          total_selling_price: '150.00',
          created_by: user[0].id
        })
        .execute();

      await expect(deleteCustomer(customer.id)).rejects.toThrow(/Cannot delete customer with existing bookings/i);
    });
  });
});
