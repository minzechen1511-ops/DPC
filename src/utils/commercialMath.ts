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
    notes: 'Highest margin direct-to-buyer checkout.',
  },
  {
    id: 'lemonsqueezy',
    name: 'Lemon Squeezy (MoR 5% + $0.50)',
    feePercent: 5.0,
    fixedFeePerSale: 0.5,
    notes: 'Merchant of record handles global VAT/sales tax.',
  },
  {
    id: 'etsy',
    name: 'Etsy Digital (~9.5% + $0.45)',
    feePercent: 9.5,
    fixedFeePerSale: 0.45,
    notes: 'Includes transaction, processing & listing fees with built-in marketplace search.',
  },
  {
    id: 'gumroad',
    name: 'Gumroad Direct (10% flat)',
    feePercent: 10.0,
    fixedFeePerSale: 0,
    notes: 'Simple creator storefront with optional Discover marketplace.',
  },
  {
    id: 'kdp',
    name: 'Amazon KDP 70% Royalty (~30% platform)',
    feePercent: 30.0,
    fixedFeePerSale: 0,
    notes: 'High-volume book channel for $2.99–$9.99 pricing.',
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
}

export interface ProfitabilityResult {
  monthlyUnits: number;
  blendedAverageOrderValue: number;
  grossMonthlyRevenue: number;
  monthlyPlatformFees: number;
  netMonthlyProfit: number;
  annualizedNetProfit: number;
  profitMarginPercent: number;
  netPerSale: number;
  breakEvenUnits: number;
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

  const monthlyUnits = Math.round(visitors * conv);
  const blendedAov = intro * introShare + regular * regularShare + bundle * bundleShare;
  const grossMonthlyRevenue = monthlyUnits * blendedAov;
  const perSaleFee = blendedAov > 0 ? blendedAov * feeRate + fixedFee : 0;
  const netPerSale = Math.max(0, blendedAov - perSaleFee);
  const monthlyPlatformFees = monthlyUnits * perSaleFee;
  const netMonthlyProfit = grossMonthlyRevenue - monthlyPlatformFees - overhead;
  const annualizedNetProfit = netMonthlyProfit * 12;
  const profitMarginPercent =
    grossMonthlyRevenue > 0 ? (netMonthlyProfit / grossMonthlyRevenue) * 100 : 0;
  const breakEvenUnits = netPerSale > 0 ? Math.ceil(overhead / netPerSale) : 0;

  return {
    monthlyUnits,
    blendedAverageOrderValue: Number(blendedAov.toFixed(2)),
    grossMonthlyRevenue: Number(grossMonthlyRevenue.toFixed(2)),
    monthlyPlatformFees: Number(monthlyPlatformFees.toFixed(2)),
    netMonthlyProfit: Number(netMonthlyProfit.toFixed(2)),
    annualizedNetProfit: Number(annualizedNetProfit.toFixed(2)),
    profitMarginPercent: Number(profitMarginPercent.toFixed(1)),
    netPerSale: Number(netPerSale.toFixed(2)),
    breakEvenUnits,
  };
}
