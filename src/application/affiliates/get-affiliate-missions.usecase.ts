import type { AffiliateRepository } from "../../infrastructure/repositories/affiliate.repository";
import { NotFoundError } from "../../shared/errors";

interface MissionDefinition {
  id: string;
  title: string;
  description: string;
  metric: "clicks" | "conversions" | "revenue";
  target: number;
  rewardLabel: string;
}

export interface AffiliateMission {
  id: string;
  title: string;
  description: string;
  metric: "clicks" | "conversions" | "revenue";
  target: number;
  current: number;
  progressPercent: number;
  completed: boolean;
  rewardLabel: string;
}

const MISSION_DEFINITIONS: MissionDefinition[] = [
  {
    id: "weekly-click-sprint",
    title: "Weekly Click Sprint",
    description: "Drive at least 50 qualified clicks this week.",
    metric: "clicks",
    target: 50,
    rewardLabel: "+2% temporary commission boost",
  },
  {
    id: "conversion-closer",
    title: "Conversion Closer",
    description: "Generate 5 conversions in the current week.",
    metric: "conversions",
    target: 5,
    rewardLabel: "$25 mission bonus",
  },
  {
    id: "revenue-lift",
    title: "Revenue Lift",
    description: "Reach $750 attributed revenue this week.",
    metric: "revenue",
    target: 750,
    rewardLabel: "Featured creator placement",
  },
];

export class GetAffiliateMissionsUseCase {
  constructor(private affiliateRepo: AffiliateRepository) {}

  async execute(userId: string) {
    const affiliate = await this.affiliateRepo.findByUserId(userId);
    if (!affiliate) {
      throw new NotFoundError("Affiliate", userId);
    }

    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    // Monday-based weekly window
    const day = since.getUTCDay();
    const diffToMonday = (day + 6) % 7;
    since.setUTCDate(since.getUTCDate() - diffToMonday);

    const snapshot = await this.affiliateRepo.getMissionWindowSnapshot(affiliate.id, since);

    const missions: AffiliateMission[] = MISSION_DEFINITIONS.map((mission) => {
      const current = mission.metric === "clicks"
        ? snapshot.clicks
        : mission.metric === "conversions"
          ? snapshot.conversions
          : snapshot.revenue;

      const progressPercent = mission.target <= 0
        ? 0
        : Math.min(100, Math.round((current / mission.target) * 100));

      return {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        metric: mission.metric,
        target: mission.target,
        current,
        progressPercent,
        completed: current >= mission.target,
        rewardLabel: mission.rewardLabel,
      };
    });

    return {
      windowStart: since.toISOString(),
      snapshot,
      missions,
      completedCount: missions.filter((mission) => mission.completed).length,
      totalCount: missions.length,
    };
  }
}
