import type {DigitalProductProject} from '../types/project.ts';
type Settings = DigitalProductProject['aiSettings'];

/** Usage from an older in-flight request must never change the engine the
 * creator has since selected, or produce a mismatched provider/model pair. */
export function addAiUsage(settings: Settings, usage?: {total_tokens?:number;estimatedCostUsd?:number}, now = new Date().toISOString()): Settings {
  const tokens=Number(usage?.total_tokens || 0);
  const cost=typeof usage?.estimatedCostUsd === 'number' ? usage.estimatedCostUsd : Number(((tokens/1_000_000)*0.35).toFixed(4));
  return {...settings,usageStats:{...settings.usageStats,totalRequests:(settings.usageStats?.totalRequests || 0)+1,totalTokens:(settings.usageStats?.totalTokens || 0)+tokens,estimatedCostUsd:Number(((settings.usageStats?.estimatedCostUsd || 0)+cost).toFixed(4)),lastRequestAt:now}};
}
