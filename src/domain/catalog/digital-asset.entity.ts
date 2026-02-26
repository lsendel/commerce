export interface DigitalAsset {
  id: string;
  productId: string;
  fileName: string;
  fileSize: number;
  storageKey: string;
  contentType: string;
  createdAt: Date;
}
