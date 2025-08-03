
import { db } from '../db';
import { hotelsTable, hotelBookingDetailsTable } from '../db/schema';
import { type Hotel, type CreateHotelInput, type UpdateHotelInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function getHotels(): Promise<Hotel[]> {
  try {
    const results = await db.select()
      .from(hotelsTable)
      .execute();

    return results.map(hotel => ({
      ...hotel,
      cost_price: parseFloat(hotel.cost_price),
      selling_price_percentage: parseFloat(hotel.selling_price_percentage)
    }));
  } catch (error) {
    console.error('Failed to fetch hotels:', error);
    throw error;
  }
}

export async function getHotelById(id: number): Promise<Hotel | null> {
  try {
    const results = await db.select()
      .from(hotelsTable)
      .where(eq(hotelsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const hotel = results[0];
    return {
      ...hotel,
      cost_price: parseFloat(hotel.cost_price),
      selling_price_percentage: parseFloat(hotel.selling_price_percentage)
    };
  } catch (error) {
    console.error('Failed to fetch hotel by ID:', error);
    throw error;
  }
}

export async function createHotel(input: CreateHotelInput): Promise<Hotel> {
  try {
    const result = await db.insert(hotelsTable)
      .values({
        name: input.name,
        location: input.location,
        cost_price: input.cost_price.toString(),
        selling_price_percentage: input.selling_price_percentage.toString()
      })
      .returning()
      .execute();

    const hotel = result[0];
    return {
      ...hotel,
      cost_price: parseFloat(hotel.cost_price),
      selling_price_percentage: parseFloat(hotel.selling_price_percentage)
    };
  } catch (error) {
    console.error('Hotel creation failed:', error);
    throw error;
  }
}

export async function updateHotel(input: UpdateHotelInput): Promise<Hotel> {
  try {
    // Build update values only for provided fields
    const updateValues: any = {};
    
    if (input.name !== undefined) {
      updateValues.name = input.name;
    }
    if (input.location !== undefined) {
      updateValues.location = input.location;
    }
    if (input.cost_price !== undefined) {
      updateValues.cost_price = input.cost_price.toString();
    }
    if (input.selling_price_percentage !== undefined) {
      updateValues.selling_price_percentage = input.selling_price_percentage.toString();
    }

    // Always update the updated_at timestamp
    updateValues.updated_at = new Date();

    const result = await db.update(hotelsTable)
      .set(updateValues)
      .where(eq(hotelsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Hotel with ID ${input.id} not found`);
    }

    const hotel = result[0];
    return {
      ...hotel,
      cost_price: parseFloat(hotel.cost_price),
      selling_price_percentage: parseFloat(hotel.selling_price_percentage)
    };
  } catch (error) {
    console.error('Hotel update failed:', error);
    throw error;
  }
}

export async function deleteHotel(id: number): Promise<void> {
  try {
    // Check for existing bookings first
    const existingBookings = await db.select()
      .from(hotelBookingDetailsTable)
      .where(eq(hotelBookingDetailsTable.hotel_id, id))
      .execute();

    if (existingBookings.length > 0) {
      throw new Error('Cannot delete hotel with existing bookings');
    }

    const result = await db.delete(hotelsTable)
      .where(eq(hotelsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Hotel with ID ${id} not found`);
    }
  } catch (error) {
    console.error('Hotel deletion failed:', error);
    throw error;
  }
}
