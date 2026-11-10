import { DigitalProductProject } from '../types/project.ts';

export function compileManuscriptMarkdown(project: DigitalProductProject): string {
  const { charter, outline, brand, intake } = project;
  let md = `# ${charter.productTitle || intake.projectName || 'Digital Product'}\n`;
  if (charter.subtitle) {
    md += `## ${charter.subtitle}\n\n`;
  }
  md += `**Author / Brand:** ${intake.creatorName || brand.profileName || 'Digital Product Studio'}\n`;
  md += `**Edition:** Official Digital Edition 1.0 (V4.0 Autopilot Architecture)\n`;
  md += `**Delivery Format:** ${charter.deliveryFormat || 'Ebook + Companion Toolkit Bundle'}\n\n`;
  md += `---\n\n`;

  // Disclaimers
  if (charter.explicitDisclaimers && charter.explicitDisclaimers.length > 0) {
    md += `### Essential Disclaimers & Usage Notice\n\n`;
    for (const d of charter.explicitDisclaimers) {
      md += `> - ${d}\n`;
    }
    md += `\n---\n\n`;
  }

  // Table of Contents
  md += `## Table of Contents\n\n`;
  for (const ch of outline) {
    const wordCount = ch.actualWordCount || ch.targetWordCount || 0;
    md += `- **Chapter ${ch.order}:** ${ch.title} *(${wordCount.toLocaleString()} words)*\n`;
  }
  md += `\n---\n\n`;

  // Chapters
  for (const ch of outline) {
    md += `\n# Chapter ${ch.order}: ${ch.title}\n\n`;
    if (ch.objective) {
      md += `*Core Chapter Objective: ${ch.objective}*\n\n`;
    }
    if (ch.contentMarkdown && ch.contentMarkdown.trim().length > 0) {
      md += `${ch.contentMarkdown}\n\n`;
    } else {
      md += `*(Manuscript draft generation in progress for this chapter.)*\n\n`;
    }

    // Well-organized Deliverable Table (substituted for raw ### 本章交付檢核)
    if (ch.practicalDeliverable) {
      md += `### Chapter Action Deliverable\n\n`;
      md += `| Action Deliverable | Target Implementation Outcome | Quality Verification |\n`;
      md += `| :--- | :--- | :--- |\n`;
      md += `| **${ch.practicalDeliverable}** | Immediate Practical Execution | Review required |\n\n`;
    }

    // Key Takeaways & Action Summary bullet points
    md += `### Key Takeaways & Action Summary\n\n`;
    md += `- **Milestone Outcome:** ${ch.completionMilestone || ch.objective || 'Complete step-by-step implementation.'}\n`;
    md += `- **Action Window:** Schedule a review after completing the companion worksheet.\n`;
    if (ch.mappedReferenceIds && ch.mappedReferenceIds.length > 0) {
      md += `- **Evidence Grounding:** Mapped sources (check claim-level support): ${ch.mappedReferenceIds.join(', ')}.\n`;
    }
    md += `\n---\n`;
  }

  return md;
}

export function compileReferenceLibraryMarkdown(project: DigitalProductProject): string {
  const { referenceLibrary } = project;
  let md = `# Verified Reference Knowledge Library (ARCE)\n\n`;
  md += `**Total Documented Sources:** ${referenceLibrary.cards.length} references\n`;
  md += `**Full-Text Verified Sources:** ${referenceLibrary.verifiedCount} references\n\n`;
  md += `This document compiles peer-reviewed, governmental, and empirical research cards adhering to the V4.0 ARCE 7-part knowledge standard.\n\n`;
  md += `---\n\n`;

  for (const card of referenceLibrary.cards) {
    md += `## [${card.id}] ${card.title}\n\n`;
    md += `**Source Title:** ${card.sourceTitle}\n`;
    md += `**Publisher / Organization:** ${card.publisherOrOrg} ${card.author ? `(${card.author})` : ''}\n`;
    md += `**Original URL:** ${card.sourceURL}\n`;
    md += `**Retrieved Date:** ${card.retrievedAt} | **Verification Status:** \`${card.status}\` | **Quality Score:** ${card.qualityScore}/100\n\n`;

    md += `### A. Title\n${card.title}\n\n`;
    md += `### B. Description & Core Project Value\n${card.description}\n\n`;

    md += `### C. Content Outline\n`;
    for (const item of card.contentOutline) {
      md += `- ${item}\n`;
    }
    md += `\n`;

    md += `### D. Practical Action Framework\n`;
    md += `**Framework Name:** ${card.practicalFramework.name}\n`;
    md += `*Editorial Attribution: ${card.practicalFramework.editorialOrigin}*\n`;
    for (const step of card.practicalFramework.actionSteps) {
      md += `1. ${step}\n`;
    }
    md += `\n`;

    md += `### E. Substantive Research Summary\n${card.researchSummary}\n\n`;

    md += `### F. Editorial Notes & Integration\n`;
    md += `- **Target Chapters:** ${card.editorialNotes.targetChapters.join(', ')}\n`;
    md += `- **Suggested Exercises:** ${card.editorialNotes.exerciseSuggestions.join('; ')}\n`;
    md += `- **Companion Worksheet Integration:** ${card.editorialNotes.worksheetIntegration}\n`;
    md += `- **Verification Notes:** ${card.editorialNotes.verificationNotes}\n\n`;

    md += `### G. Brand & Audience Communication Guidelines\n`;
    md += `- **Tone Application:** ${card.brandGuidelines.toneApplication}\n`;
    md += `- **Visual Direction:** ${card.brandGuidelines.visualDirection}\n`;
    md += `- **Audience Framing:** ${card.brandGuidelines.audienceFraming}\n\n`;

    if (card.supportedClaims && card.supportedClaims.length > 0) {
      md += `**Supported Key Factual Claims:**\n`;
      for (const claim of card.supportedClaims) {
        md += `- ${claim}\n`;
      }
      md += `\n`;
    }

    md += `---\n\n`;
  }

  return md;
}

export function compileCompanionResourcesMarkdown(project: DigitalProductProject): string {
  const { resources, charter } = project;
  let md = `# ${charter.productTitle || 'Digital Product'} — Companion Toolkit & Worksheets\n\n`;
  md += `This companion suite provides fillable worksheets, action checklists, daily/weekly schedules, and practical templates designed for immediate execution.\n\n---\n\n`;

  for (const r of resources) {
    md += `## [${r.category}] ${r.title}\n\n`;
    md += `**Core Objective:** ${r.purpose}\n\n`;
    md += `**Action Instructions:**\n${r.instructions}\n\n`;

    if (r.contentMarkdown) {
      md += `### Template Content & Fillable Structure:\n\n${r.contentMarkdown}\n\n`;
    }

    if (r.sampleEntries && r.sampleEntries.length > 0) {
      md += `### Example Completed Entries:\n`;
      for (const s of r.sampleEntries) {
        md += `- ${s}\n`;
      }
      md += `\n`;
    }

    md += `**Completion Acceptance Standard:** ${r.completionCriteria}\n\n`;
    md += `---\n\n`;
  }

  return md;
}

export function compileLaunchAssetsMarkdown(project: DigitalProductProject): string {
  const { salesAssets, pricingReport, charter } = project;
  let md = `# Go-to-Market Launch & Sales Copy Suite\n\n`;
  md += `**Product Title:** ${charter.productTitle}\n`;
  md += `**Pricing Structure:** Regular $${pricingReport.regularPrice} / Launch Test $${pricingReport.introductoryPrice} / VIP Bundle $${pricingReport.bundlePrice} (${pricingReport.currency})\n\n`;
  md += `---\n\n`;

  md += `## 1. High-Converting Sales Page Copy\n\n`;
  md += `### Headline:\n# ${salesAssets.salesPageHeadline}\n\n`;
  md += `### Subheadline:\n## ${salesAssets.salesPageSubheadline}\n\n`;
  md += `### Hero Pitch:\n${salesAssets.heroPitch}\n\n`;

  md += `### Feature & Transformation Highlights:\n`;
  for (const b of salesAssets.productDescriptionBullets) {
    md += `- ${b}\n`;
  }
  md += `\n`;

  md += `### Ideal Buyer Persona:\n${salesAssets.targetBuyerNotice}\n\n`;
  md += `### Who This Is NOT For:\n${salesAssets.notForBuyerNotice}\n\n`;

  md += `### Frequently Asked Questions (FAQ):\n`;
  for (const faq of salesAssets.faqList) {
    md += `**Q: ${faq.question}**\n\nA: ${faq.answer}\n\n`;
  }

  md += `---\n\n`;
  md += `## 2. Lead Magnet & Audience Acquisition Concept\n\n`;
  md += `**Title:** ${salesAssets.leadMagnetConcept.title}\n`;
  md += `**Hook:** ${salesAssets.leadMagnetConcept.hook}\n`;
  md += `**Format:** ${salesAssets.leadMagnetConcept.format}\n`;
  md += `**Deliverable:** ${salesAssets.leadMagnetConcept.deliverable}\n\n`;

  md += `---\n\n`;
  md += `## 3. 5-Email Automated Launch Sequence\n\n`;
  for (const email of salesAssets.emailLaunchSequence) {
    md += `### Day ${email.day} — ${email.subject}\n`;
    md += `*Goal: ${email.goal}* | *Preview Text: ${email.preview}*\n\n`;
    md += `${email.bodyMarkdown}\n\n---\n\n`;
  }

  md += `## 4. 30-Day Go-to-Market Execution Road Map\n\n`;
  for (const plan of salesAssets.thirtyDayLaunchPlan) {
    md += `### Week ${plan.week}: ${plan.focus}\n`;
    for (const t of plan.tasks) {
      md += `- [ ] ${t}\n`;
    }
    md += `\n`;
  }

  return md;
}

export { compileStyledHtml } from './styledBook.ts';
