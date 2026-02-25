export interface ItineraryStep {
  time: string;
  description: string;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface BookingConfig {
  location: string;
  included: string[];
  notIncluded: string[];
  itinerary: ItineraryStep[];
  faqs: Faq[];
  cancellationPolicy: string;
}

export function createBookingConfig(
  params: Partial<BookingConfig>
): BookingConfig {
  return {
    location: params.location ?? "",
    included: params.included ?? [],
    notIncluded: params.notIncluded ?? [],
    itinerary: params.itinerary ?? [],
    faqs: params.faqs ?? [],
    cancellationPolicy: params.cancellationPolicy ?? "",
  };
}
