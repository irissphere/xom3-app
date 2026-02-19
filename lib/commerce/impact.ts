import { getStoreStats } from "./store-client";

export interface ImpactMilestone {
  id: string;
  label: string;
  threshold: number;
  reward: string;
  icon: string;
  achieved: boolean;
}

export const IMPACT_MILESTONES_CONFIG = [
  { id: 'silver', label: 'Silver', threshold: 250, reward: '1 Bag Dog Food or 1 Care Package', icon: '🥈' },
  { id: 'gold', label: 'Gold', threshold: 500, reward: '3 Bags or 3 Care Packages', icon: '🥇' },
  { id: 'platinum', label: 'Platinum', threshold: 1000, reward: '5 Bags or 5 Care Packages', icon: '💎' },
  { id: 'diamond', label: 'Diamond', threshold: 2500, reward: '10 Bags or 10 Care Packages', icon: '👑' },
];

export async function getUserImpactData(userId: string) {
  // In a real multi-tenant system, we would filter by userId
  // For now, we use aggregate store stats as "Operator Impact"
  const stats = await getStoreStats();
  const currentSpend = stats ? parseFloat(stats.totalSales) : 0;
  
  const milestones: ImpactMilestone[] = IMPACT_MILESTONES_CONFIG.map(m => ({
    ...m,
    achieved: currentSpend >= m.threshold
  }));
  
  const nextMilestone = IMPACT_MILESTONES_CONFIG.find(m => currentSpend < m.threshold) || IMPACT_MILESTONES_CONFIG[IMPACT_MILESTONES_CONFIG.length - 1];
  
  // Logic for social contribution calculation
  let bagsDonated = 0;
  let carePackages = 0;
  
  if (currentSpend >= 2500) { bagsDonated = 10; carePackages = 10; }
  else if (currentSpend >= 1000) { bagsDonated = 5; carePackages = 5; }
  else if (currentSpend >= 500) { bagsDonated = 3; carePackages = 3; }
  else if (currentSpend >= 250) { bagsDonated = 1; carePackages = 1; }

  return {
    currentSpend,
    nextMilestone: nextMilestone.threshold,
    milestones,
    totalImpact: {
      bagsDonated,
      carePackages
    }
  };
}













