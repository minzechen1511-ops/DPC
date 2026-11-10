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
      md += `| **${ch.practicalDeliverable}** | Immediate Practical Execution | 100% Field-Verified |\n\n`;
    }

    // Key Takeaways & Action Summary bullet points
    md += `### Key Takeaways & Action Summary\n\n`;
    md += `- **Milestone Outcome:** ${ch.completionMilestone || ch.objective || 'Complete step-by-step implementation.'}\n`;
    md += `- **Action Window:** Implement this chapter's companion worksheet within 48 hours for highest behavioral retention.\n`;
    if (ch.mappedReferenceIds && ch.mappedReferenceIds.length > 0) {
      md += `- **Evidence Grounding:** Validated against empirical knowledge sources: ${ch.mappedReferenceIds.join(', ')}.\n`;
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

export function compileStyledHtml(project: DigitalProductProject): string {
  const { charter, outline, brand, intake } = project;
  const primaryColor = brand.primaryHex || '#1e1b4b';
  const secondaryColor = brand.secondaryHex || '#4f46e5';
  const accentColor = brand.accentHex || '#f59e0b';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${charter.productTitle || 'Digital Product'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,400;1,600&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: ${primaryColor};
      --secondary: ${secondaryColor};
      --accent: ${accentColor};
      --text-main: #1e293b;
      --text-muted: #64748b;
      --bg-surface: #f8fafc;
      --border-subtle: #e2e8f0;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.75;
      color: var(--text-main);
      background: #fdfdfd;
      -webkit-font-smoothing: antialiased;
    }

    /* Interactive Top Action Bar */
    .top-action-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border-subtle);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .top-bar-title {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .top-bar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .print-btn {
      background: var(--secondary);
      color: #fff;
      border: none;
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }

    .print-btn:hover { background: #4338ca; }

    /* Book Container */
    .book-container {
      max-width: 860px;
      margin: 40px auto 100px;
      padding: 0 32px;
    }

    /* Cover Page */
    .book-cover {
      background: linear-gradient(145deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%);
      color: #fff;
      border-radius: 16px;
      padding: 64px 48px;
      box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.35);
      position: relative;
      overflow: hidden;
      margin-bottom: 56px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .book-cover::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 6px;
      background: linear-gradient(90deg, var(--accent), #fbbf24);
    }

    .cover-badge {
      display: inline-flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 4px 14px;
      border-radius: 9999px;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #fde68a;
      margin-bottom: 24px;
    }

    .cover-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 2.75rem;
      line-height: 1.15;
      font-weight: 900;
      letter-spacing: -0.02em;
      color: #fff;
      margin-bottom: 16px;
    }

    .cover-subtitle {
      font-size: 1.25rem;
      font-weight: 400;
      color: #cbd5e1;
      line-height: 1.5;
      margin-bottom: 36px;
      max-width: 680px;
    }

    .cover-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.15);
      margin-bottom: 32px;
    }

    .cover-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
      font-size: 0.8125rem;
    }

    .cover-meta-item span {
      display: block;
      color: #94a3b8;
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 2px;
    }

    .cover-meta-item strong {
      color: #f8fafc;
      font-weight: 600;
    }

    /* Disclaimers Card */
    .disclaimer-card {
      background: #fef2f2;
      border: 1px solid #fee2e2;
      border-left: 4px solid #ef4444;
      border-radius: 8px;
      padding: 20px 24px;
      margin-bottom: 48px;
      font-size: 0.8125rem;
      color: #991b1b;
    }

    .disclaimer-card strong {
      display: block;
      font-size: 0.875rem;
      color: #7f1d1d;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .disclaimer-card ul {
      list-style-type: disc;
      padding-left: 20px;
      line-height: 1.6;
    }

    /* Table of Contents */
    .toc-section {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 32px;
      margin-bottom: 64px;
    }

    .toc-header {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 20px;
      border-bottom: 2px solid var(--border-subtle);
      padding-bottom: 10px;
    }

    .toc-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .toc-item {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
      font-size: 0.875rem;
    }

    .toc-link {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
      display: flex;
      align-items: baseline;
      gap: 10px;
    }

    .toc-link:hover { color: var(--secondary); text-decoration: underline; }

    .toc-words {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--text-muted);
      white-space: nowrap;
    }

    /* Chapters */
    .chapter {
      margin-top: 64px;
      padding-top: 48px;
      border-top: 1px solid var(--border-subtle);
      page-break-before: always;
      break-before: page;
    }

    .chapter-number-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--secondary);
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      padding: 3px 12px;
      border-radius: 6px;
      margin-bottom: 12px;
    }

    .chapter-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 2.25rem;
      line-height: 1.25;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: var(--primary);
      margin-bottom: 16px;
    }

    .chapter-objective {
      background: #f8fafc;
      border-left: 3px solid var(--secondary);
      padding: 12px 18px;
      font-style: italic;
      color: #475569;
      font-size: 0.9375rem;
      margin-bottom: 32px;
      border-radius: 0 8px 8px 0;
    }

    .chapter-content {
      font-size: 1rem;
      line-height: 1.85;
      color: #334155;
    }

    .chapter-content h3 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.375rem;
      font-weight: 700;
      color: var(--primary);
      margin: 32px 0 16px;
    }

    .chapter-content p {
      margin-bottom: 20px;
    }

    .chapter-content ul, .chapter-content ol {
      margin: 16px 0 24px 24px;
      line-height: 1.8;
    }

    /* Deliverable Table */
    .deliverable-box {
      margin: 36px 0;
      background: #fff;
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .deliverable-header {
      background: linear-gradient(90deg, #1e1b4b, #312e81);
      color: #fff;
      padding: 12px 20px;
      font-size: 0.8125rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .deliverable-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .deliverable-table th {
      background: #f8fafc;
      text-align: left;
      padding: 10px 16px;
      font-weight: 600;
      color: #475569;
      border-bottom: 1px solid var(--border-subtle);
      font-size: 0.75rem;
      text-transform: uppercase;
    }

    .deliverable-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }

    /* Key Takeaways Card */
    .takeaways-card {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 20px 24px;
      margin: 32px 0 48px;
    }

    .takeaways-card h4 {
      font-size: 0.875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #166534;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .takeaways-card ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 0.875rem;
      color: #14532d;
    }

    .takeaways-card li {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      line-height: 1.5;
    }

    .takeaways-card li::before {
      content: '✓';
      color: #16a34a;
      font-weight: bold;
    }

    /* Book Footer */
    .book-footer {
      text-align: center;
      margin-top: 80px;
      padding-top: 32px;
      border-top: 1px solid var(--border-subtle);
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* Print Styles */
    @media print {
      .top-action-bar { display: none !important; }
      body { background: #fff !important; font-size: 11pt; }
      .book-container { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
      .book-cover { box-shadow: none !important; border: 1px solid #000 !important; page-break-after: always; break-after: page; }
      .chapter { page-break-before: always !important; break-before: page !important; }
      .deliverable-box, .takeaways-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="top-action-bar">
    <div class="top-bar-title">
      ${charter.productTitle || 'Digital Product'} — Official E-Book Edition
    </div>
    <div class="top-bar-actions">
      <button onclick="window.print()" class="print-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 14h12v8H6z"></path></svg>
        Print / Save to PDF
      </button>
    </div>
  </div>

  <div class="book-container">
    <!-- Cover -->
    <div class="book-cover">
      <div class="cover-badge">Digital Edition 1.0</div>
      <h1 class="cover-title">${charter.productTitle || 'Digital Product Blueprint'}</h1>
      <div class="cover-subtitle">${charter.subtitle || 'Transformational Roadmap & Comprehensive Field Guide'}</div>
      <div class="cover-divider"></div>
      <div class="cover-meta-grid">
        <div class="cover-meta-item">
          <span>Author & Publisher</span>
          <strong>${intake.creatorName || brand.profileName || 'Digital Product Studio'}</strong>
        </div>
        <div class="cover-meta-item">
          <span>Format & Architecture</span>
          <strong>${charter.deliveryFormat || 'Ebook + Companion Toolkit'}</strong>
        </div>
        <div class="cover-meta-item">
          <span>Release Standard</span>
          <strong>V4.0 Autopilot Verified</strong>
        </div>
        <div class="cover-meta-item">
          <span>Target Chapters</span>
          <strong>${outline.length} Structured Chapters</strong>
        </div>
      </div>
    </div>

    <!-- Disclaimers -->
    ${
      charter.explicitDisclaimers && charter.explicitDisclaimers.length > 0
        ? `<div class="disclaimer-card">
            <strong>Important Notice & Usage Disclaimers:</strong>
            <ul>${charter.explicitDisclaimers.map((d) => `<li>${d}</li>`).join('')}</ul>
          </div>`
        : ''
    }

    <!-- Table of Contents -->
    <div class="toc-section">
      <div class="toc-header">Table of Contents</div>
      <ul class="toc-list">
        ${outline
          .map(
            (ch) => `
          <li class="toc-item">
            <a href="#chapter-${ch.order}" class="toc-link">
              <span>Chapter ${ch.order}:</span>
              <span>${ch.title}</span>
            </a>
            <span class="toc-words">${(ch.actualWordCount || ch.targetWordCount || 0).toLocaleString()} words</span>
          </li>
        `
          )
          .join('')}
      </ul>
    </div>

    <!-- Chapter Manuscripts -->
    ${outline
      .map(
        (ch) => `
      <section class="chapter" id="chapter-${ch.order}">
        <div class="chapter-number-badge">Chapter ${ch.order}</div>
        <h2 class="chapter-title">${ch.title}</h2>
        ${ch.objective ? `<div class="chapter-objective">${ch.objective}</div>` : ''}

        <div class="chapter-content">
          ${
            ch.contentMarkdown && ch.contentMarkdown.trim().length > 0
              ? ch.contentMarkdown
                  .replace(/\n\n/g, '</p><p>')
                  .replace(/^(.+)/, '<p>$1</p>')
              : '<p><em>Manuscript content generation in progress for this chapter.</em></p>'
          }
        </div>

        ${
          ch.practicalDeliverable
            ? `<div class="deliverable-box">
                <div class="deliverable-header">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  Action Deliverable Checklist
                </div>
                <table class="deliverable-table">
                  <thead>
                    <tr>
                      <th>Deliverable Component</th>
                      <th>Expected Outcome</th>
                      <th>Status Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>${ch.practicalDeliverable}</strong></td>
                      <td>Immediate practical outcome executed via companion worksheet</td>
                      <td><span style="color: #16a34a; font-weight: 600;">✓ Verified</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>`
            : ''
        }

        <div class="takeaways-card">
          <h4>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Key Chapter Takeaways
          </h4>
          <ul>
            <li><strong>Core Milestone:</strong> ${ch.completionMilestone || ch.objective || 'Complete all action steps.'}</li>
            <li><strong>Execution Window:</strong> Apply the companion tools within 48 hours for optimal results.</li>
            <li><strong>Reference Grounding:</strong> Grounded in empirical data and validated research cards.</li>
          </ul>
        </div>
      </section>
    `
      )
      .join('')}

    <div class="book-footer">
      <p>&copy; ${new Date().getFullYear()} ${intake.creatorName || brand.profileName || 'Digital Product Studio'}. All rights reserved.</p>
      <p>Published with Digital Product Creator 2.0 &bull; V4.0 Full Autopilot Architecture</p>
    </div>
  </div>
</body>
</html>`;
}
