
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { servicesTable, bookingsTable, serviceBookingDetailsTable, customersTable, usersTable } from '../db/schema';
import { type CreateServiceInput, type UpdateServiceInput } from '../schema';
import { getServices, getServiceById, createService, updateService, deleteService } from '../handlers/services';
import { eq } from 'drizzle-orm';

const testServiceInput: CreateServiceInput = {
  name: 'Airport Transfer',
  cost_price: 150.00,
  selling_price_percentage: 120.50
};

const testServiceInput2: CreateServiceInput = {
  name: 'City Tour',
  cost_price: 200.00,
  selling_price_percentage: 130.00
};

describe('Services Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createService', () => {
    it('should create a service', async () => {
      const result = await createService(testServiceInput);

      expect(result.name).toEqual('Airport Transfer');
      expect(result.cost_price).toEqual(150.00);
      expect(typeof result.cost_price).toBe('number');
      expect(result.selling_price_percentage).toEqual(120.50);
      expect(typeof result.selling_price_percentage).toBe('number');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save service to database', async () => {
      const result = await createService(testServiceInput);

      const services = await db.select()
        .from(servicesTable)
        .where(eq(servicesTable.id, result.id))
        .execute();

      expect(services).toHaveLength(1);
      expect(services[0].name).toEqual('Airport Transfer');
      expect(parseFloat(services[0].cost_price)).toEqual(150.00);
      expect(parseFloat(services[0].selling_price_percentage)).toEqual(120.50);
      expect(services[0].created_at).toBeInstanceOf(Date);
    });

    it('should handle zero cost price', async () => {
      const zeroInput: CreateServiceInput = {
        name: 'Free Service',
        cost_price: 0,
        selling_price_percentage: 100
      };

      const result = await createService(zeroInput);

      expect(result.name).toEqual('Free Service');
      expect(result.cost_price).toEqual(0);
      expect(result.selling_price_percentage).toEqual(100);
    });
  });

  describe('getServices', () => {
    it('should return empty array when no services exist', async () => {
      const result = await getServices();

      expect(result).toEqual([]);
    });

    it('should return all services', async () => {
      await createService(testServiceInput);
      await createService(testServiceInput2);

      const result = await getServices();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('Airport Transfer');
      expect(result[0].cost_price).toEqual(150.00);
      expect(typeof result[0].cost_price).toBe('number');
      expect(result[1].name).toEqual('City Tour');
      expect(result[1].cost_price).toEqual(200.00);
      expect(typeof result[1].cost_price).toBe('number');
    });

    it('should return services ordered by creation', async () => {
      const service1 = await createService(testServiceInput);
      const service2 = await createService(testServiceInput2);

      const result = await getServices();

      expect(result).toHaveLength(2);
      expect(result[0].id).toEqual(service1.id);
      expect(result[1].id).toEqual(service2.id);
    });
  });

  describe('getServiceById', () => {
    it('should return null for non-existent service', async () => {
      const result = await getServiceById(999);

      expect(result).toBeNull();
    });

    it('should return service by ID', async () => {
      const created = await createService(testServiceInput);

      const result = await getServiceById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.name).toEqual('Airport Transfer');
      expect(result!.cost_price).toEqual(150.00);
      expect(typeof result!.cost_price).toBe('number');
      expect(result!.selling_price_percentage).toEqual(120.50);
      expect(typeof result!.selling_price_percentage).toBe('number');
    });
  });

  describe('updateService', () => {
    it('should update service name only', async () => {
      const created = await createService(testServiceInput);

      const updateInput: UpdateServiceInput = {
        id: created.id,
        name: 'Updated Transfer Service'
      };

      const result = await updateService(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Updated Transfer Service');
      expect(result.cost_price).toEqual(150.00); // Unchanged
      expect(result.selling_price_percentage).toEqual(120.50); // Unchanged
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should update cost price only', async () => {
      const created = await createService(testServiceInput);

      const updateInput: UpdateServiceInput = {
        id: created.id,
        cost_price: 175.00
      };

      const result = await updateService(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Airport Transfer'); // Unchanged
      expect(result.cost_price).toEqual(175.00);
      expect(typeof result.cost_price).toBe('number');
      expect(result.selling_price_percentage).toEqual(120.50); // Unchanged
    });

    it('should update selling price percentage only', async () => {
      const created = await createService(testServiceInput);

      const updateInput: UpdateServiceInput = {
        id: created.id,
        selling_price_percentage: 140.00
      };

      const result = await updateService(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Airport Transfer'); // Unchanged
      expect(result.cost_price).toEqual(150.00); // Unchanged
      expect(result.selling_price_percentage).toEqual(140.00);
      expect(typeof result.selling_price_percentage).toBe('number');
    });

    it('should update all fields', async () => {
      const created = await createService(testServiceInput);

      const updateInput: UpdateServiceInput = {
        id: created.id,
        name: 'Premium Transfer',
        cost_price: 250.00,
        selling_price_percentage: 150.00
      };

      const result = await updateService(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Premium Transfer');
      expect(result.cost_price).toEqual(250.00);
      expect(result.selling_price_percentage).toEqual(150.00);
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should throw error for non-existent service', async () => {
      const updateInput: UpdateServiceInput = {
        id: 999,
        name: 'Non-existent Service'
      };

      expect(updateService(updateInput)).rejects.toThrow(/not found/i);
    });

    it('should save changes to database', async () => {
      const created = await createService(testServiceInput);

      const updateInput: UpdateServiceInput = {
        id: created.id,
        name: 'Database Updated Service',
        cost_price: 300.00
      };

      await updateService(updateInput);

      const services = await db.select()
        .from(servicesTable)
        .where(eq(servicesTable.id, created.id))
        .execute();

      expect(services).toHaveLength(1);
      expect(services[0].name).toEqual('Database Updated Service');
      expect(parseFloat(services[0].cost_price)).toEqual(300.00);
      expect(parseFloat(services[0].selling_price_percentage)).toEqual(120.50);
    });
  });

  describe('deleteService', () => {
    it('should delete service successfully', async () => {
      const created = await createService(testServiceInput);

      await deleteService(created.id);

      const services = await db.select()
        .from(servicesTable)
        .where(eq(servicesTable.id, created.id))
        .execute();

      expect(services).toHaveLength(0);
    });

    it('should throw error for non-existent service', async () => {
      expect(deleteService(999)).rejects.toThrow(/not found/i);
    });

    it('should prevent deletion when service is used in bookings', async () => {
      // Create test data
      const customer = await db.insert(customersTable)
        .values({
          name: 'Test Customer',
          address: 'Test Address',
          phone: '123456789',
          email: 'test@test.com'
        })
        .returning()
        .execute();

      const user = await db.insert(usersTable)
        .values({
          name: 'Test User',
          username: 'testuser',
          password_hash: 'hashedpassword',
          role: 'staff'
        })
        .returning()
        .execute();

      const service = await createService(testServiceInput);

      const booking = await db.insert(bookingsTable)
        .values({
          customer_id: customer[0].id,
          booking_number: 'BK001',
          total_cost_price: '150.00',
          total_selling_price: '180.00',
          created_by: user[0].id
        })
        .returning()
        .execute();

      // Create service booking detail
      await db.insert(serviceBookingDetailsTable)
        .values({
          booking_id: booking[0].id,
          service_id: service.id,
          quantity: 1,
          cost_price: '150.00',
          selling_price: '180.00'
        })
        .execute();

      // Attempt to delete service should fail
      expect(deleteService(service.id)).rejects.toThrow(/cannot delete service.*referenced in bookings/i);

      // Verify service still exists
      const result = await getServiceById(service.id);
      expect(result).not.toBeNull();
    });
  });
});
