export interface PlatformFeePreset {
  id: 'gumroad' | 'lemonsqueezy' | 'etsy' | 'kdp' | 'stripe';
  name: string;
  feePercent: number;
  fixedFeePerSale: number;
  notes: string;
}

export const PLATFORM_FEE_PRESETS: PlatformFeePreset[] = [
  {
    id: 'stripe',
    name: 'Direct Checkout (Stripe 2.9% + $0.30)',
    feePercent: 2.9,
    fixedFeePerSale: 0.3,
    notes: 'Illustrative fee assumption only; verify current processor, country, currency and tax charges.',
  },
  {
    id: 'lemonsqueezy',
    name: 'Lemon Squeezy (MoR 5% + $0.50)',
    feePercent: 5.0,
    fixedFeePerSale: 0.5,
    notes: 'Illustrative MoR fee assumption; verify current eligibility, tax handling and additional charges.',
  },
  {
    id: 'etsy',
    name: 'Etsy Digital (~9.5% + $0.45)',
    feePercent: 9.5,
    fixedFeePerSale: 0.45,
    notes: 'Illustrative combined fee assumption; regional processing, ads and taxes may add costs.',
  },
  {
    id: 'gumroad',
    name: 'Gumroad Direct (10% flat)',
    feePercent: 10.0,
    fixedFeePerSale: 0,
    notes: 'Illustrative direct-sale fee assumption; verify current transaction and discovery fees.',
  },
  {
    id: 'kdp',
    name: 'Amazon KDP 70% Royalty (~30% platform)',
    feePercent: 30.0,
    fixedFeePerSale: 0,
    notes: 'Illustrative royalty assumption; territory, price, delivery costs and eligibility remain unknown.',
  },
];

export interface ProfitabilityInput {
  introductoryPrice: number;
  regularPrice: number;
  bundlePrice: number;
  monthlyVisitors: number;
  conversionRatePercent: number;
  bundleSharePercent: number;
  introSharePercent: number;
  platformFeePercent: number;
  fixedFeePerSale: number;
  monthlyOverheadUsd: number;
  monthlyAcquisitionCostUsd?: number;
}

export interface ProfitabilityResult {
  monthlyUnits: number;
  blendedAverageOrderValue: number;
  grossMonthlyRevenue: number;
  monthlyPlatformFees: number;
  monthlyAcquisitionCostUsd: number;
  effectiveCacPerSale: number | null;
  netMonthlyProfit: number;
  annualizedNetProfit: number;
  profitMarginPercent: number;
  netPerSale: number;
  breakEvenUnits: number | null;
}

const clamp = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;

export function calculateProfitability(input: ProfitabilityInput): ProfitabilityResult {
  const intro = clamp(input.introductoryPrice, 0, 10000);
  const regular = clamp(input.regularPrice, 0, 10000);
  const bundle = clamp(input.bundlePrice, 0, 10000);
  const visitors = clamp(input.monthlyVisitors, 0, 10_000_000);
  const conv = clamp(input.conversionRatePercent, 0, 100) / 100;
  const bundleShare = clamp(input.bundleSharePercent, 0, 100) / 100;
  const introShare = clamp(input.introSharePercent, 0, 100 - bundleShare * 100) / 100;
  const regularShare = Math.max(0, 1 - bundleShare - introShare);
  const feeRate = clamp(input.platformFeePercent, 0, 95) / 100;
  const fixedFee = clamp(input.fixedFeePerSale, 0, 50);
  const overhead = clamp(input.monthlyOverheadUsd, 0, 1_000_000);
  const acquisitionCost = clamp(input.monthlyAcquisitionCostUsd ?? 0, 0, 1_000_000);

  const monthlyUnits = Math.round(visitors * conv);
  const blendedAov = intro * introShare + regular * regularShare + bundle * bundleShare;
  const grossMonthlyRevenue = monthlyUnits * blendedAov;
  const perSaleFee = blendedAov > 0 ? blendedAov * feeRate + fixedFee : 0;
  const netPerSale = blendedAov - perSaleFee;
  const monthlyPlatformFees = monthlyUnits * perSaleFee;
  const totalFixedCosts = overhead + acquisitionCost;
  const netMonthlyProfit = grossMonthlyRevenue - monthlyPlatformFees - totalFixedCosts;
  const annualizedNetProfit = netMonthlyProfit * 12;
  const profitMarginPercent =
    grossMonthlyRevenue > 0 ? (netMonthlyProfit / grossMonthlyRevenue) * 100 : 0;
  const breakEvenUnits = netPerSale > 0 ? Math.ceil(totalFixedCosts / netPerSale) : null;
  const effectiveCacPerSale =
    monthlyUnits > 0 ? Number((acquisitionCost / monthlyUnits).toFixed(2)) : null;

  return {
    monthlyUnits,
    blendedAverageOrderValue: Number(blendedAov.toFixed(2)),
    grossMonthlyRevenue: Number(grossMonthlyRevenue.toFixed(2)),
    monthlyPlatformFees: Number(monthlyPlatformFees.toFixed(2)),
    monthlyAcquisitionCostUsd: Number(acquisitionCost.toFixed(2)),
    effectiveCacPerSale,
    netMonthlyProfit: Number(netMonthlyProfit.toFixed(2)),
    annualizedNetProfit: Number(annualizedNetProfit.toFixed(2)),
    profitMarginPercent: Number(profitMarginPercent.toFixed(1)),
    netPerSale: Number(netPerSale.toFixed(2)),
    breakEvenUnits,
  };
}
