export interface DownloadToken {
  id: string;
  storeId: string;
  userId: string;
  orderId: string;
  orderItemId: string | null;
  token: string;
  expiresAt: Date;
  downloadedAt: Date | null;
  revoked: boolean;
  createdAt: Date;
}
