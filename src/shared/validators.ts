import { z } from "zod";

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Auth
export const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[0-9]/, "Must contain number"),
  name: z.string().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[0-9]/, "Must contain number"),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  locale: z.string().min(2).max(10).optional(),
  timezone: z.string().min(1).max(50).optional(),
  marketingOptIn: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[0-9]/, "Must contain number"),
});

// Address
export const addressSchema = z.object({
  label: z.string().optional(),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().optional(),
  zip: z.string().min(1),
  country: z.string().length(2),
  isDefault: z.boolean().optional(),
});

// Product filters
export const productFilterSchema = z.object({
  type: z
    .enum(["physical", "digital", "subscription", "bookable"])
    .optional(),
  collection: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  available: z.coerce.boolean().optional(),
  sort: z.enum(["price_asc", "price_desc", "newest", "name"]).optional(),
});

// Cart
export const addToCartSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  bookingAvailabilityId: z.string().uuid().optional(),
  personTypeQuantities: z
    .record(z.string(), z.number().int().min(0))
    .optional(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0),
});

// Checkout
export const createCheckoutSchema = z.object({
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

// Booking availability
export const createAvailabilitySchema = z.object({
  productId: z.string().uuid(),
  slotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotTime: z.string().regex(/^\d{2}:\d{2}$/),
  totalCapacity: z.number().int().min(1),
  prices: z
    .array(
      z.object({
        personType: z.enum(["adult", "child", "pet"]),
        price: z.number().min(0),
      }),
    )
    .min(1),
});

export const bulkCreateAvailabilitySchema = z.object({
  productId: z.string().uuid(),
  slots: z
    .array(
      z.object({
        slotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        slotTime: z.string().regex(/^\d{2}:\d{2}$/),
        totalCapacity: z.number().int().min(1),
      }),
    )
    .min(1),
  prices: z
    .array(
      z.object({
        personType: z.enum(["adult", "child", "pet"]),
        price: z.number().min(0),
      }),
    )
    .min(1),
});

export const availabilityFilterSchema = z.object({
  productId: z.string().uuid(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z
    .enum([
      "available",
      "full",
      "in_progress",
      "completed",
      "closed",
      "canceled",
    ])
    .optional(),
});

// Booking
export const createBookingRequestSchema = z.object({
  availabilityId: z.string().uuid(),
  personTypeQuantities: z.record(
    z.enum(["adult", "child", "pet"]),
    z.number().int().min(0),
  ),
});

// AI Studio
export const generateArtworkSchema = z.object({
  petProfileId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  customPrompt: z.string().max(500).optional(),
});

export const createPetProfileSchema = z.object({
  name: z.string().min(1).max(50),
  species: z.string().min(1).max(50),
  breed: z.string().max(50).optional(),
});

// Subscription
export const createSubscriptionSchema = z.object({
  planId: z.string().uuid(),
});

// Fulfillment
export const syncCatalogSchema = z.object({
  printfulProductIds: z.array(z.number().int()).optional(),
});

// ID param
export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const slugParamSchema = z.object({
  slug: z.string(),
});
