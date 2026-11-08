export interface SalesReportData {
  from: string;
  to: string;
  totalSales: number;
  ordersCount: number;
  averageTicket: number;
  cancelledCount: number;
  cancelledAmount: number;
  channelMix: {
    deliveryCount: number;
    deliverySales: number;
    takeawayCount: number;
    takeawaySales: number;
  };
  paymentMix: Record<string, { count: number; total: number }>;
  dailySales: Array<{ date: string; sales: number; count: number }>;
}

export interface FoodCostItem {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  theoreticalUnitCost: number;
  theoreticalTotalCost: number;
  grossMargin: number;
  foodCostPct: number;
}

export interface FoodCostReportData {
  from: string;
  to: string;
  totalRevenue: number;
  totalTheoreticalCost: number;
  overallFoodCostPct: number;
  wasteCost: number;
  items: FoodCostItem[];
}

export type MenuQuadrant = 'ESTRELLA' | 'CABALLO' | 'PUZZLE' | 'PERRO';

export interface MenuEngineeringItem {
  productId: string;
  name: string;
  unitsSold: number;
  popularityPct: number;
  marginPerUnit: number;
  totalMargin: number;
  quadrant: MenuQuadrant;
  recommendation: string;
}

export interface MenuEngineeringReportData {
  from: string;
  to: string;
  avgMarginThreshold: number;
  popularityThresholdPct: number;
  items: MenuEngineeringItem[];
  quadrantCounts: Record<MenuQuadrant, number>;
}

export interface ZoneProfitabilityItem {
  zoneId: string;
  zoneName: string;
  ordersCount: number;
  salesTotal: number;
  feesCollected: number;
  courierCosts: number;
  netDeliveryProfit: number;
  averageTicket: number;
}

export interface ZoneProfitabilityReportData {
  from: string;
  to: string;
  totalOrders: number;
  totalSales: number;
  totalFeesCollected: number;
  totalCourierCosts: number;
  netDeliveryProfitTotal: number;
  zones: ZoneProfitabilityItem[];
}

export interface CustomerReportData {
  from: string;
  to: string;
  totalCustomers: number;
  newCustomersCount: number;
  returningCustomersCount: number;
  segmentCounts: Record<string, number>;
  tierCounts: Record<string, number>;
  pointsIssued: number;
  pointsRedeemed: number;
  activePointsBalance: number;
  pointsLiabilityARS: number;
}
