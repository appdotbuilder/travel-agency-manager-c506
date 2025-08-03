
import { db } from '../db';
import { servicesTable, serviceBookingDetailsTable } from '../db/schema';
import { type Service, type CreateServiceInput, type UpdateServiceInput } from '../schema';
import { eq, count } from 'drizzle-orm';

export async function getServices(): Promise<Service[]> {
  try {
    const results = await db.select()
      .from(servicesTable)
      .execute();

    return results.map(service => ({
      ...service,
      cost_price: parseFloat(service.cost_price),
      selling_price_percentage: parseFloat(service.selling_price_percentage)
    }));
  } catch (error) {
    console.error('Failed to fetch services:', error);
    throw error;
  }
}

export async function getServiceById(id: number): Promise<Service | null> {
  try {
    const results = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const service = results[0];
    return {
      ...service,
      cost_price: parseFloat(service.cost_price),
      selling_price_percentage: parseFloat(service.selling_price_percentage)
    };
  } catch (error) {
    console.error('Failed to fetch service by ID:', error);
    throw error;
  }
}

export async function createService(input: CreateServiceInput): Promise<Service> {
  try {
    const results = await db.insert(servicesTable)
      .values({
        name: input.name,
        cost_price: input.cost_price.toString(),
        selling_price_percentage: input.selling_price_percentage.toString()
      })
      .returning()
      .execute();

    const service = results[0];
    return {
      ...service,
      cost_price: parseFloat(service.cost_price),
      selling_price_percentage: parseFloat(service.selling_price_percentage)
    };
  } catch (error) {
    console.error('Service creation failed:', error);
    throw error;
  }
}

export async function updateService(input: UpdateServiceInput): Promise<Service> {
  try {
    // Build update values dynamically
    const updateValues: any = {};
    
    if (input.name !== undefined) {
      updateValues.name = input.name;
    }
    if (input.cost_price !== undefined) {
      updateValues.cost_price = input.cost_price.toString();
    }
    if (input.selling_price_percentage !== undefined) {
      updateValues.selling_price_percentage = input.selling_price_percentage.toString();
    }

    // Add updated timestamp
    updateValues.updated_at = new Date();

    const results = await db.update(servicesTable)
      .set(updateValues)
      .where(eq(servicesTable.id, input.id))
      .returning()
      .execute();

    if (results.length === 0) {
      throw new Error(`Service with ID ${input.id} not found`);
    }

    const service = results[0];
    return {
      ...service,
      cost_price: parseFloat(service.cost_price),
      selling_price_percentage: parseFloat(service.selling_price_percentage)
    };
  } catch (error) {
    console.error('Service update failed:', error);
    throw error;
  }
}

export async function deleteService(id: number): Promise<void> {
  try {
    // Check if service is used in any bookings
    const bookingCount = await db.select({ count: count() })
      .from(serviceBookingDetailsTable)
      .where(eq(serviceBookingDetailsTable.service_id, id))
      .execute();

    if (bookingCount[0].count > 0) {
      throw new Error('Cannot delete service that is referenced in bookings');
    }

    const results = await db.delete(servicesTable)
      .where(eq(servicesTable.id, id))
      .returning()
      .execute();

    if (results.length === 0) {
      throw new Error(`Service with ID ${id} not found`);
    }
  } catch (error) {
    console.error('Service deletion failed:', error);
    throw error;
  }
}
