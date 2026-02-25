export const CART_COOKIE_NAME = "petm8_cart";
export const AUTH_COOKIE_NAME = "petm8_auth";
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export const JWT_ALGORITHM = "HS256";
export const PBKDF2_ITERATIONS = 100_000;
export const PBKDF2_HASH = "SHA-256";
export const SALT_LENGTH = 16;
export const BOOKING_REQUEST_TTL_MINUTES = 15;
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Platform
export const AFFILIATE_COOKIE_NAME = "petm8_ref";
export const AFFILIATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const CIRCUIT_BREAKER_THRESHOLD = 5;
export const CIRCUIT_BREAKER_RESET_MS = 60_000; // 60 seconds
