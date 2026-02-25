export interface AffiliateLink {
  id: string;
  affiliateId: string;
  targetUrl: string;
  shortCode: string;
  clickCount: number;
  createdAt: Date;
}

export function createAffiliateLink(
  params: Omit<AffiliateLink, "createdAt" | "clickCount">,
): AffiliateLink {
  return { ...params, clickCount: 0, createdAt: new Date() };
}
