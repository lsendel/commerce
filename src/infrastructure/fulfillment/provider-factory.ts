import type { FulfillmentProvider } from "./fulfillment-provider.interface";
import { PrintfulProvider } from "./printful.provider";
import { GootenProvider } from "./gooten.provider";
import { ProdigiProvider } from "./prodigi.provider";
import { ShapewaysProvider } from "./shapeways.provider";
import { CircuitBreaker } from "./circuit-breaker";
import type { FulfillmentProviderType } from "../../shared/types";

const circuitBreakers = new Map<string, CircuitBreaker>();

function getCircuitBreaker(name: string): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name));
  }
  return circuitBreakers.get(name)!;
}

export function createFulfillmentProvider(
  type: FulfillmentProviderType,
  config: { apiKey: string; apiSecret?: string; storeId?: string },
): FulfillmentProvider {
  const breaker = getCircuitBreaker(`fulfillment-${type}`);

  switch (type) {
    case "printful":
      return new PrintfulProvider(config.apiKey, breaker);
    case "gooten":
      return new GootenProvider(config.apiKey, breaker);
    case "prodigi":
      return new ProdigiProvider(config.apiKey, breaker);
    case "shapeways":
      return new ShapewaysProvider(config.apiKey, breaker);
    default:
      throw new Error(`Unknown fulfillment provider type: ${type}`);
  }
}
