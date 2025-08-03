
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['administrator', 'staff']);
export const currencyEnum = pgEnum('currency', ['SAR', 'USD', 'IDR']);
export const roomTypeEnum = pgEnum('room_type', ['single', 'double', 'triple', 'quad']);
export const mealPlanEnum = pgEnum('meal_plan', ['no_meal', 'breakfast', 'halfboard', 'fullboard']);
export const bookingStatusEnum = pgEnum('booking_status', ['draft', 'confirmed', 'cancelled', 'completed']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'partial', 'paid']);

// Company Settings Table
export const companySettingsTable = pgTable('company_settings', {
  id: serial('id').primaryKey(),
  company_name: text('company_name').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  tax_number: text('tax_number'),
  logo_url: text('logo_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Currency Exchange Rates Table
export const currencyExchangeRatesTable = pgTable('currency_exchange_rates', {
  id: serial('id').primaryKey(),
  from_currency: currencyEnum('from_currency').notNull(),
  to_currency: currencyEnum('to_currency').notNull(),
  rate: numeric('rate', { precision: 15, scale: 6 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Users Table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Customers Table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Hotels Table
export const hotelsTable = pgTable('hotels', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  cost_price: numeric('cost_price', { precision: 10, scale: 2 }).notNull(),
  selling_price_percentage: numeric('selling_price_percentage', { precision: 5, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Services Table
export const servicesTable = pgTable('services', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  cost_price: numeric('cost_price', { precision: 10, scale: 2 }).notNull(),
  selling_price_percentage: numeric('selling_price_percentage', { precision: 5, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Bookings Table
export const bookingsTable = pgTable('bookings', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').references(() => customersTable.id).notNull(),
  booking_number: text('booking_number').notNull().unique(),
  total_cost_price: numeric('total_cost_price', { precision: 10, scale: 2 }).notNull(),
  total_selling_price: numeric('total_selling_price', { precision: 10, scale: 2 }).notNull(),
  status: bookingStatusEnum('status').default('draft').notNull(),
  payment_status: paymentStatusEnum('payment_status').default('pending').notNull(),
  created_by: integer('created_by').references(() => usersTable.id).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Hotel Booking Details Table
export const hotelBookingDetailsTable = pgTable('hotel_booking_details', {
  id: serial('id').primaryKey(),
  booking_id: integer('booking_id').references(() => bookingsTable.id).notNull(),
  hotel_id: integer('hotel_id').references(() => hotelsTable.id).notNull(),
  room_type: roomTypeEnum('room_type').notNull(),
  meal_plan: mealPlanEnum('meal_plan').notNull(),
  check_in_date: date('check_in_date').notNull(),
  check_out_date: date('check_out_date').notNull(),
  number_of_rooms: integer('number_of_rooms').notNull(),
  cost_price: numeric('cost_price', { precision: 10, scale: 2 }).notNull(),
  selling_price: numeric('selling_price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Service Booking Details Table
export const serviceBookingDetailsTable = pgTable('service_booking_details', {
  id: serial('id').primaryKey(),
  booking_id: integer('booking_id').references(() => bookingsTable.id).notNull(),
  service_id: integer('service_id').references(() => servicesTable.id).notNull(),
  quantity: integer('quantity').notNull(),
  cost_price: numeric('cost_price', { precision: 10, scale: 2 }).notNull(),
  selling_price: numeric('selling_price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Payments Table
export const paymentsTable = pgTable('payments', {
  id: serial('id').primaryKey(),
  booking_id: integer('booking_id').references(() => bookingsTable.id).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum('currency').notNull(),
  amount_in_sar: numeric('amount_in_sar', { precision: 10, scale: 2 }).notNull(),
  payment_date: timestamp('payment_date').defaultNow().notNull(),
  notes: text('notes'),
  created_by: integer('created_by').references(() => usersTable.id).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Expenses Table
export const expensesTable = pgTable('expenses', {
  id: serial('id').primaryKey(),
  booking_id: integer('booking_id').references(() => bookingsTable.id).notNull(),
  expense_name: text('expense_name').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  created_by: integer('created_by').references(() => usersTable.id).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const customersRelations = relations(customersTable, ({ many }) => ({
  bookings: many(bookingsTable)
}));

export const usersRelations = relations(usersTable, ({ many }) => ({
  bookings: many(bookingsTable),
  payments: many(paymentsTable),
  expenses: many(expensesTable)
}));

export const hotelsRelations = relations(hotelsTable, ({ many }) => ({
  hotelBookingDetails: many(hotelBookingDetailsTable)
}));

export const servicesRelations = relations(servicesTable, ({ many }) => ({
  serviceBookingDetails: many(serviceBookingDetailsTable)
}));

export const bookingsRelations = relations(bookingsTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [bookingsTable.customer_id],
    references: [customersTable.id]
  }),
  createdBy: one(usersTable, {
    fields: [bookingsTable.created_by],
    references: [usersTable.id]
  }),
  hotelBookingDetails: many(hotelBookingDetailsTable),
  serviceBookingDetails: many(serviceBookingDetailsTable),
  payments: many(paymentsTable),
  expenses: many(expensesTable)
}));

export const hotelBookingDetailsRelations = relations(hotelBookingDetailsTable, ({ one }) => ({
  booking: one(bookingsTable, {
    fields: [hotelBookingDetailsTable.booking_id],
    references: [bookingsTable.id]
  }),
  hotel: one(hotelsTable, {
    fields: [hotelBookingDetailsTable.hotel_id],
    references: [hotelsTable.id]
  })
}));

export const serviceBookingDetailsRelations = relations(serviceBookingDetailsTable, ({ one }) => ({
  booking: one(bookingsTable, {
    fields: [serviceBookingDetailsTable.booking_id],
    references: [bookingsTable.id]
  }),
  service: one(servicesTable, {
    fields: [serviceBookingDetailsTable.service_id],
    references: [servicesTable.id]
  })
}));

export const paymentsRelations = relations(paymentsTable, ({ one }) => ({
  booking: one(bookingsTable, {
    fields: [paymentsTable.booking_id],
    references: [bookingsTable.id]
  }),
  createdBy: one(usersTable, {
    fields: [paymentsTable.created_by],
    references: [usersTable.id]
  })
}));

export const expensesRelations = relations(expensesTable, ({ one }) => ({
  booking: one(bookingsTable, {
    fields: [expensesTable.booking_id],
    references: [bookingsTable.id]
  }),
  createdBy: one(usersTable, {
    fields: [expensesTable.created_by],
    references: [usersTable.id]
  })
}));

// Export all tables for proper query building
export const tables = {
  companySettings: companySettingsTable,
  currencyExchangeRates: currencyExchangeRatesTable,
  users: usersTable,
  customers: customersTable,
  hotels: hotelsTable,
  services: servicesTable,
  bookings: bookingsTable,
  hotelBookingDetails: hotelBookingDetailsTable,
  serviceBookingDetails: serviceBookingDetailsTable,
  payments: paymentsTable,
  expenses: expensesTable
};
