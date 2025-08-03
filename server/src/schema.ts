
import { z } from 'zod';

// Enums
export const userRoleSchema = z.enum(['administrator', 'staff']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const currencySchema = z.enum(['SAR', 'USD', 'IDR']);
export type Currency = z.infer<typeof currencySchema>;

export const roomTypeSchema = z.enum(['single', 'double', 'triple', 'quad']);
export type RoomType = z.infer<typeof roomTypeSchema>;

export const mealPlanSchema = z.enum(['no_meal', 'breakfast', 'halfboard', 'fullboard']);
export type MealPlan = z.infer<typeof mealPlanSchema>;

export const bookingStatusSchema = z.enum(['draft', 'confirmed', 'cancelled', 'completed']);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

export const paymentStatusSchema = z.enum(['pending', 'partial', 'paid']);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

// Company Settings Schema
export const companySettingsSchema = z.object({
  id: z.number(),
  company_name: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string().email(),
  tax_number: z.string().nullable(),
  logo_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CompanySettings = z.infer<typeof companySettingsSchema>;

export const updateCompanySettingsInputSchema = z.object({
  company_name: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string().email(),
  tax_number: z.string().nullable(),
  logo_url: z.string().nullable()
});

export type UpdateCompanySettingsInput = z.infer<typeof updateCompanySettingsInputSchema>;

// Currency Exchange Rate Schema
export const currencyExchangeRateSchema = z.object({
  id: z.number(),
  from_currency: currencySchema,
  to_currency: currencySchema,
  rate: z.number().positive(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CurrencyExchangeRate = z.infer<typeof currencyExchangeRateSchema>;

export const createCurrencyExchangeRateInputSchema = z.object({
  from_currency: currencySchema,
  to_currency: currencySchema,
  rate: z.number().positive()
});

export type CreateCurrencyExchangeRateInput = z.infer<typeof createCurrencyExchangeRateInputSchema>;

export const updateCurrencyExchangeRateInputSchema = z.object({
  id: z.number(),
  rate: z.number().positive()
});

export type UpdateCurrencyExchangeRateInput = z.infer<typeof updateCurrencyExchangeRateInputSchema>;

// User Schema
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  username: z.string(),
  password_hash: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  name: z.string(),
  username: z.string(),
  password: z.string().min(6),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  username: z.string().optional(),
  password: z.string().min(6).optional(),
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Customer Schema
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string().email(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

export const createCustomerInputSchema = z.object({
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string().email()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

export const updateCustomerInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional()
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;

// Hotel Schema
export const hotelSchema = z.object({
  id: z.number(),
  name: z.string(),
  location: z.string(),
  cost_price: z.number().nonnegative(),
  selling_price_percentage: z.number().positive(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Hotel = z.infer<typeof hotelSchema>;

export const createHotelInputSchema = z.object({
  name: z.string(),
  location: z.string(),
  cost_price: z.number().nonnegative(),
  selling_price_percentage: z.number().positive()
});

export type CreateHotelInput = z.infer<typeof createHotelInputSchema>;

export const updateHotelInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  location: z.string().optional(),
  cost_price: z.number().nonnegative().optional(),
  selling_price_percentage: z.number().positive().optional()
});

export type UpdateHotelInput = z.infer<typeof updateHotelInputSchema>;

// Service Schema
export const serviceSchema = z.object({
  id: z.number(),
  name: z.string(),
  cost_price: z.number().nonnegative(),
  selling_price_percentage: z.number().positive(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Service = z.infer<typeof serviceSchema>;

export const createServiceInputSchema = z.object({
  name: z.string(),
  cost_price: z.number().nonnegative(),
  selling_price_percentage: z.number().positive()
});

export type CreateServiceInput = z.infer<typeof createServiceInputSchema>;

export const updateServiceInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  cost_price: z.number().nonnegative().optional(),
  selling_price_percentage: z.number().positive().optional()
});

export type UpdateServiceInput = z.infer<typeof updateServiceInputSchema>;

// Booking Schema
export const bookingSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  booking_number: z.string(),
  total_cost_price: z.number().nonnegative(),
  total_selling_price: z.number().nonnegative(),
  status: bookingStatusSchema,
  payment_status: paymentStatusSchema,
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Booking = z.infer<typeof bookingSchema>;

export const createBookingInputSchema = z.object({
  customer_id: z.number(),
  hotel_bookings: z.array(z.object({
    hotel_id: z.number(),
    room_type: roomTypeSchema,
    meal_plan: mealPlanSchema,
    check_in_date: z.coerce.date(),
    check_out_date: z.coerce.date(),
    number_of_rooms: z.number().int().positive()
  })),
  services: z.array(z.object({
    service_id: z.number(),
    quantity: z.number().int().positive()
  }))
});

export type CreateBookingInput = z.infer<typeof createBookingInputSchema>;

// Hotel Booking Detail Schema
export const hotelBookingDetailSchema = z.object({
  id: z.number(),
  booking_id: z.number(),
  hotel_id: z.number(),
  room_type: roomTypeSchema,
  meal_plan: mealPlanSchema,
  check_in_date: z.coerce.date(),
  check_out_date: z.coerce.date(),
  number_of_rooms: z.number().int(),
  cost_price: z.number().nonnegative(),
  selling_price: z.number().nonnegative(),
  created_at: z.coerce.date()
});

export type HotelBookingDetail = z.infer<typeof hotelBookingDetailSchema>;

// Service Booking Detail Schema
export const serviceBookingDetailSchema = z.object({
  id: z.number(),
  booking_id: z.number(),
  service_id: z.number(),
  quantity: z.number().int(),
  cost_price: z.number().nonnegative(),
  selling_price: z.number().nonnegative(),
  created_at: z.coerce.date()
});

export type ServiceBookingDetail = z.infer<typeof serviceBookingDetailSchema>;

// Payment Schema
export const paymentSchema = z.object({
  id: z.number(),
  booking_id: z.number(),
  amount: z.number().positive(),
  currency: currencySchema,
  amount_in_sar: z.number().positive(),
  payment_date: z.coerce.date(),
  notes: z.string().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date()
});

export type Payment = z.infer<typeof paymentSchema>;

export const createPaymentInputSchema = z.object({
  booking_id: z.number(),
  amount: z.number().positive(),
  currency: currencySchema,
  notes: z.string().nullable()
});

export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

// Expense Schema
export const expenseSchema = z.object({
  id: z.number(),
  booking_id: z.number(),
  expense_name: z.string(),
  amount: z.number().positive(),
  created_by: z.number(),
  created_at: z.coerce.date()
});

export type Expense = z.infer<typeof expenseSchema>;

export const createExpenseInputSchema = z.object({
  booking_id: z.number(),
  expense_name: z.string(),
  amount: z.number().positive()
});

export type CreateExpenseInput = z.infer<typeof createExpenseInputSchema>;

// Dashboard Stats Schema
export const dashboardStatsSchema = z.object({
  customer_count: z.number().int(),
  booking_count: z.number().int(),
  total_profit: z.number(),
  outstanding_payments: z.number()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Report Schemas
export const profitLossReportSchema = z.object({
  booking_id: z.number(),
  booking_number: z.string(),
  customer_name: z.string(),
  total_selling_price: z.number(),
  total_cost_price: z.number(),
  total_expenses: z.number(),
  profit: z.number(),
  created_at: z.coerce.date()
});

export type ProfitLossReport = z.infer<typeof profitLossReportSchema>;

export const outstandingInvoiceSchema = z.object({
  booking_id: z.number(),
  booking_number: z.string(),
  customer_name: z.string(),
  total_amount: z.number(),
  paid_amount: z.number(),
  outstanding_amount: z.number(),
  created_at: z.coerce.date()
});

export type OutstandingInvoice = z.infer<typeof outstandingInvoiceSchema>;
