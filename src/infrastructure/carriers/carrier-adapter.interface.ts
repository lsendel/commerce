export interface CarrierAddress {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface CarrierPackage {
  weightOz: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
}

export interface CarrierShippingOption {
  serviceCode: string;
  serviceName: string;
  price: number;
  currency: string;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
}

export interface CarrierAdapter {
  readonly carrier: string;

  getRates(
    origin: CarrierAddress,
    destination: CarrierAddress,
    packages: CarrierPackage[],
  ): Promise<CarrierShippingOption[]>;
}
