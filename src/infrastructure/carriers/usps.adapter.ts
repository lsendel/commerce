import type {
  CarrierAdapter,
  CarrierAddress,
  CarrierPackage,
  CarrierShippingOption,
} from "./carrier-adapter.interface";

export class UspsAdapter implements CarrierAdapter {
  readonly carrier = "usps";

  async getRates(
    _origin: CarrierAddress,
    _destination: CarrierAddress,
    _packages: CarrierPackage[],
  ): Promise<CarrierShippingOption[]> {
    throw new Error(
      "USPS integration not configured. Set USPS_API_KEY in environment to enable real-time USPS rate calculation.",
    );
  }
}
