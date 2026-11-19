// SYNTHETIC CONTRACT / COMPONENT FIXTURE ONLY. Never import into actual research.
import { BLANK_PROJECT } from '../src/data/demoProject.ts';
import type { MarketplaceObservation } from '../src/types/project.ts';
import { deriveSynchronizedCandidates } from '../src/utils/marketDiscoveryEngine.ts';

export function journeyFixture(collected = true) {
  const project = structuredClone(BLANK_PROJECT);
  project.projectId = 'TEST-ONLY-gate-a-journey';
  project.name = 'Synthetic Gate A UI fixture — NOT MARKET RESEARCH';
  if (collected) {
    const time = new Date().toISOString();
    const observation: MarketplaceObservation = {
      id:'TEST-ONLY-APPLE', marketplace:'Apple Books', category:'Business & Productivity',
      productTitle:'Synthetic Systems Guide', sellerOrAuthor:'Test-only author',
      productURL:'https://books.apple.com/us/book/id100000', currentPrice:0, priceKnown:false, currency:'USD',
      observedRank:4, rankScope:'Synthetic chart fixture', productFormat:'Ebook', observedAt:time,
      dataAsOfDate:time, retrievedAt:time, collector:'apple-chart-v1', acquisitionMethod:'live_collector',
      sourceClass:'primary_marketplace', evidenceType:'official_ranking', reviewStatus:'retrieved_checked',
      evidenceLevel:'VERIFIED_RANKING', sourceURL:'https://rss.marketingtools.apple.com/api/v2/us/books/top-paid/100/books.json',
      evidenceExcerpt:'Synthetic fixture: position 4; not an actual source request.', excerptLocator:'Synthetic row 4',
      evidenceChainId:'TEST-ONLY-CHAIN', dataLimitations:'TEST FIXTURE ONLY — not actual market evidence.', isSample:false,
    };
    project.marketResearch.platformEvidence = [observation];
    project.marketResearch.topicCandidates = deriveSynchronizedCandidates([observation]);
  }
  return project;
}
