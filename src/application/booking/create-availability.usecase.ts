import type { BookingRepository } from "../../infrastructure/repositories/booking.repository";
import type { ProductRepository } from "../../infrastructure/repositories/product.repository";
import { NotFoundError, ValidationError } from "../../shared/errors";

interface CreateAvailabilityInput {
  productId: string;
  slotDate: string;
  slotTime: string;
  totalCapacity: number;
  prices: Array<{
    personType: "adult" | "child" | "pet";
    price: number;
  }>;
}

interface BulkCreateAvailabilityInput {
  productId: string;
  slots: Array<{
    slotDate: string;
    slotTime: string;
    totalCapacity: number;
  }>;
  prices: Array<{
    personType: "adult" | "child" | "pet";
    price: number;
  }>;
}

export class CreateAvailabilityUseCase {
  constructor(
    private bookingRepo: BookingRepository,
    private productRepo: ProductRepository,
  ) {}

  async execute(input: CreateAvailabilityInput) {
    // Validate product exists and is bookable
    const product = await this.productRepo.findById(input.productId);
    if (!product) {
      throw new NotFoundError("Product", input.productId);
    }
    if (product.type !== "bookable") {
      throw new ValidationError(
        `Product "${product.name}" is type "${product.type}", expected "bookable"`,
      );
    }

    // Validate at least one price entry
    if (!input.prices || input.prices.length === 0) {
      throw new ValidationError("At least one price entry is required");
    }

    // Validate slot date is not in the past
    const slotDate = new Date(`${input.slotDate}T${input.slotTime}:00Z`);
    if (slotDate < new Date()) {
      throw new ValidationError("Cannot create availability slots in the past");
    }

    const slot = await this.bookingRepo.createAvailability({
      productId: input.productId,
      slotDate: input.slotDate,
      slotTime: input.slotTime,
      totalCapacity: input.totalCapacity,
      prices: input.prices,
    });

    return {
      id: slot.id,
      productId: slot.productId,
      slotDate: slot.slotDate,
      slotTime: slot.slotTime,
      totalCapacity: slot.totalCapacity,
      bookedCount: slot.reservedCount,
      status: slot.status,
      prices: slot.prices.map((p) => ({
        personType: p.personType,
        price: p.price,
      })),
    };
  }

  async executeBulk(input: BulkCreateAvailabilityInput) {
    // Validate product exists and is bookable
    const product = await this.productRepo.findById(input.productId);
    if (!product) {
      throw new NotFoundError("Product", input.productId);
    }
    if (product.type !== "bookable") {
      throw new ValidationError(
        `Product "${product.name}" is type "${product.type}", expected "bookable"`,
      );
    }

    if (!input.prices || input.prices.length === 0) {
      throw new ValidationError("At least one price entry is required");
    }

    if (!input.slots || input.slots.length === 0) {
      throw new ValidationError("At least one slot is required");
    }

    const results = await this.bookingRepo.bulkCreateAvailability(
      input.productId,
      input.slots,
      input.prices,
    );

    const slots = results.map((slot) => ({
      id: slot.id,
      productId: slot.productId,
      slotDate: slot.slotDate,
      slotTime: slot.slotTime,
      totalCapacity: slot.totalCapacity,
      bookedCount: slot.reservedCount,
      status: slot.status,
      prices: slot.prices.map((p) => ({
        personType: p.personType,
        price: p.price,
      })),
    }));

    return { created: slots.length, slots };
  }
}
