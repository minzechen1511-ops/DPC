# Digital Product Creator 2.0 — Master Application Build Prompt
## V4.0 Full Autopilot & OpenRouter Edition

**File:** `prompt.md`  
**Version:** 1.0 — V4.0 Build Execution Prompt  
**Application:** Digital Product Creator 2.0  
**Target:** Gemini Canvas, AI coding agent, or full-stack development environment  
**Primary UI Language:** 繁體中文  
**Generated Product Language:** Configurable by target market  
**Date:** 2026-11-10

---

# 1. YOUR ROLE AND PRIMARY MISSION

You are an elite senior full-stack software engineer, AI systems architect, OpenRouter API integration specialist, autonomous workflow engineer, market research analyst, product strategist, instructional designer, UI/UX designer, and software quality assurance engineer.

Your task is to **build a real, working, AI-powered digital product creation application named Digital Product Creator 2.0**.

The user has supplied the master functional specification:

`digital-product-creator-v4-full-autopilot-openrouter.md`

**Read that entire specification before implementing the application.**

This file is the execution prompt. The V4.0 Markdown specification defines the complete intended application behavior.

When the two documents overlap:
- Follow the V4.0 specification for functionality and workflow.
- Follow this prompt for implementation discipline, prioritization, test requirements, and release decisions.
- Follow actual platform security restrictions and current API documentation.
- Do not silently remove important functionality.
- Clearly identify anything that the current environment cannot implement.

## 1.1 Non-Negotiable Mission

Create an application where the user can:

1. Start a new digital product project.
2. Receive AI-researched product topic recommendations based on current obtainable marketplace evidence.
3. Select a recommended topic with one click.
4. Automatically generate all 13 standard project fields.
5. Automatically collect and process up to 20 credible research references.
6. Generate a Unique Value Zone analysis.
7. Generate a Visceral Transformation Map.
8. Generate a Transformative Product Charter.
9. Select a recommended product outline.
10. Automatically generate complete product content.
11. Create practical companion resources.
12. Perform automated content quality checks.
13. Apply brand design and assemble the final product.
14. Generate pricing and launch recommendations.
15. Download usable digital product files.

The user should mainly interact through **buttons, selections, approvals, and optional edits**.

The normal workflow must not require manually writing a new prompt at every stage.

## 1.2 Critical Design Principle

**AUTOMATE THE WORK. LET THE USER MAKE THE IMPORTANT DECISIONS.**

Do not build a chat application that merely displays AI instructions to copy and paste elsewhere.

Do not build a static dashboard with decorative buttons.

Do not hardcode sample content and describe it as AI-generated content.

Do not simulate marketplace research, API responses, successful exports, or long-running job progress.

Every major action must connect to actual application logic.

---

# 2. DEVELOPMENT EXECUTION RULES

Before coding, inspect the capabilities of the available environment.

Determine:
- Can you create a React/TypeScript application?
- Is a server-side runtime available?
- Can you call external APIs?
- Is secure storage available?
- Can you use persistent databases?
- Can you run background jobs?
- Can you retrieve remote documents and webpages?
- Can you create and download actual files?
- Can you use Gemini Canvas AI features?
- Can you test the application?

Make reasonable implementation decisions based on the environment.

Do not stop merely because optional capabilities are unavailable.

## 2.1 If Gemini Canvas Is the Only Runtime

Build the strongest functional application supported by Canvas.

Use Canvas-compatible capabilities for:
- Interactive UI.
- Project intake.
- Stage selection.
- State management.
- AI generation through supported mechanisms.
- Editing.
- Basic project backup.
- Markdown and JSON export.

If external web research, OpenRouter key security, durable server-side jobs, or cloud persistence requires an independent backend:

1. Build the frontend integration surfaces.
2. Define real backend API contracts.
3. Clearly label the feature as requiring integration.
4. Provide deployable backend code or implementation files when the environment permits.
5. Do not claim that unavailable services are already connected.

## 2.2 If Full-Stack Development Is Available

Implement the production-oriented architecture.

Recommended stack:
- Next.js.
- React.
- TypeScript.
- Tailwind CSS or equivalent.
- Server-side API routes.
- PostgreSQL or comparable database.
- Object storage for documents and exports.
- Background job queue.
- OpenRouter API provider.
- Search and retrieval adapters.
- Structured output validation.
- Markdown/HTML rendering.
- Actual export generation.

Adapt to the available environment rather than requiring unsupported libraries.

## 2.3 Implementation Priority

**FUNCTIONALITY FIRST. POLISH SECOND.**

Start with a working end-to-end vertical slice before extending the application.

Do not produce 15 visually complete pages if the actual generation and research features still use placeholder outputs.

---

# 3. USER EXPERIENCE — SELECTION-DRIVEN AUTOPILOT

Build the application around the principle of minimum user effort.

## 3.1 Default New Project Experience

When the user clicks:

**Create New Digital Product**

The system should automatically:

1. Load saved user preferences.
2. Use default target market and product-format settings.
3. Begin current market research when a real research service is connected.
4. Generate recommended product opportunities.
5. Rank the opportunities.
6. Display the strongest candidates.
7. Allow the user to select one.

After topic approval, proceed through the remaining stages using the shared project context.

## 3.2 Required Approval Gates

Default to only three major human decision points:

**Gate A — Topic Selection**

The user selects one recommended product topic.

**Gate B — Product Strategy Approval**

The user accepts or edits the recommended product title, audience, promise, format, and outline.

**Gate C — Final Quality Review**

The user reviews remaining major risks, completeness, and publication readiness.

All other routine steps should run automatically when technically supported.

Allow users to configure more frequent reviews if desired.

## 3.3 Interaction Rules

At every decision point:
- Provide 2–3 meaningful options when appropriate.
- Preselect the recommended option.
- Explain the recommendation concisely.
- Allow one-click acceptance.
- Allow manual changes.
- Save the selection.
- Continue automatically to the next valid stage.

Never repeatedly ask for information already stored in the project.

When information is missing but not essential, use a clearly marked default.

Do not invent personal experience, professional qualifications, customer feedback, sales results, or research findings.

---

# 4. APPLICATION INFORMATION ARCHITECTURE

Build a responsive, professional SaaS interface.

## 4.1 Main Navigation

Create these screens:

1. Dashboard
2. Market Intelligence
3. Topic Recommendations
4. Project Setup — 13 Fields
5. Unique Value Zone
6. Visceral Transformation Map
7. Automatic Reference Library
8. Product Charter
9. Outline Builder
10. Full Content Studio
11. Workbook & Bonus Resources
12. Quality Assurance
13. Brand & Design Studio
14. Pricing & Launch
15. Export Center
16. My Projects
17. AI Model & API Settings
18. Automation Settings

All navigation items must work.

If a feature has not been connected, show an accurate setup-required state instead of a fake completed view.

## 4.2 Dashboard

Show:
- Current project.
- Topic.
- Product type.
- Target market.
- Buyer persona.
- Product status.
- Overall progress.
- Current stage.
- Number of verified references.
- Completed chapters.
- Actual generated word count.
- Quality status.
- Active AI model.
- Known API usage.
- Last save.
- Errors or blockers.

Primary controls:
- Start New Project.
- Research Topics.
- Run Autopilot.
- Resume Project.
- View References.
- Change AI Model.
- Review Product.
- Export Product.

## 4.3 Visual Design

Use a clean, premium SaaS visual language:
- Light and dark mode.
- Responsive layout.
- Clear typography.
- Consistent spacing.
- Rounded panels.
- Accessible contrast.
- Visible focus indicators.
- Progress bars.
- Status icons.
- Clear empty states.
- Well-designed loading and error states.

Use restrained colors.

Prioritize readability over decorative effects.

---

# 5. MARKET INTELLIGENCE ENGINE

Implement a real **Market Trend & Recommendation Engine (MTRE)**.

This must be the default first stage for new projects.

## 5.1 Research Targets

Search relevant, accessible marketplace evidence from:
- Amazon Kindle.
- Apple Books.
- Google Play Books.
- Kobo.
- Barnes & Noble.
- Gumroad.
- Payhip.
- Etsy where applicable.
- Other suitable licensed data sources.

Use official rankings, public marketplace pages, supported APIs, and legitimate search sources.

Do not bypass paywalls, authentication barriers, anti-bot protections, or marketplace terms.

## 5.2 Research Data Requirements

For each observed product, store when available:
- Marketplace.
- Category.
- Product title.
- Author or merchant.
- Listing URL.
- Listed price.
- Currency.
- Observed ranking.
- Ranking category and scope.
- Review count.
- Rating.
- Product format.
- Date observed.
- Evidence type.
- Data limitations.

Do not invent missing fields.

Distinguish:
- Verified category ranking.
- Featured recommendation.
- Search-result listing.
- Seller-provided claim.
- Third-party estimate.
- Unverified hypothesis.

Reviews do not equal sales.

Do not present rank movement or growth rates without actual historical observations.

## 5.3 Research Time Windows

Support:
- 7 days.
- 30 days.
- 90 days.
- 12 months.

Where historical snapshots do not exist, display the available observation dates and avoid inventing trends.

Save periodic research snapshots when persistent infrastructure is available.

## 5.4 Topic Recommendation Engine

Cluster observed products by:
- Topic.
- Audience.
- Problem.
- Intended outcome.
- Format.
- Price level.
- Product features.

Generate 5–10 candidate product opportunities.

Use the V4.0 opportunity scoring rubric.

Display for each candidate:
- Suggested product name.
- Buyer segment.
- Problem.
- Big promise.
- Market evidence.
- Competition.
- Differentiation.
- Estimated creation difficulty.
- Suggested format.
- Price-test range.
- Potential companion resources.
- Confidence rating.
- Opportunity score.
- Source links.

Provide:
- Best Overall Opportunity.
- Easiest to Launch.
- Strong Differentiation Opportunity.

The user selects a topic by clicking its card.

The ranking score is a decision heuristic, not a guaranteed sales forecast.

## 5.5 Research Failure Behavior

If real marketplace retrieval is unavailable:
- Clearly display the missing integration.
- Preserve any verifiable evidence obtained.
- Do not fabricate a live bestseller report.
- Allow a clearly labeled evergreen-idea mode only with user consent.
- Keep the research stage recoverable.

---

# 6. AUTOMATIC 13-FIELD PROJECT BRIEF

Immediately after the user selects a topic:

**Trigger generation of all 13 established project fields.**

Exact fields:
1. Project name.
2. Creator or business name.
3. Experience level.
4. Years or nature of relevant experience.
5. Expertise and professional skills.
6. Interests and passions.
7. Target audience.
8. Problems you can solve.
9. Existing product idea.
10. Desired transformation.
11. Brand style and voice.
12. Constraints and topics to exclude.
13. Recommended digital product price.

Use:
- Approved topic.
- Market research.
- Saved user preferences.
- Genuine creator details.
- Clearly labeled assumptions.

Generate fully usable text for every field.

The Brand Style field must specify:
- Brand personality.
- Colors and hex values.
- Typography direction.
- Writing voice.
- Visual design.
- Emotional positioning.
- Styles to avoid.

The Constraints field must specify:
- Product boundaries.
- Content accuracy standards.
- Relevant safety rules.
- Copyright and attribution.
- Claims to avoid.
- Verification requirements.

The Pricing field must provide:
- Regular price hypothesis.
- Introductory test price.
- Optional premium bundle.
- Comparable price evidence if available.
- Rationale.
- Uncertainty.

Provide:
- Accept All.
- Edit Field.
- Regenerate Field.
- Lock Field.
- Continue.

Store all approved content in the shared project state.

---

# 7. AUTOMATIC REFERENCE COLLECTION ENGINE

Implement **ARCE — Automatic Reference Collection Engine**.

This is a mandatory core feature.

## 7.1 Trigger

As soon as a topic is approved:

`TOPIC_APPROVED -> START_REFERENCE_RESEARCH`

When supported, run the reference discovery job while the user reviews project brief suggestions.

Do not require manual URL entry.

## 7.2 Research Process

The engine must:

1. Analyze the selected product topic.
2. Determine five to eight research pillars.
3. Generate search queries for those pillars.
4. Discover approximately 40–60 candidate sources, subject to configured research budgets.
5. Normalize source identities and URLs.
6. Deduplicate.
7. Retrieve actual accessible pages or documents.
8. Evaluate source credibility, relevance, currency, and clarity.
9. Reject low-quality or inaccessible material.
10. Select up to 20 distinct, useful sources with balanced coverage.
11. Generate the complete seven-part research card for each accepted source.
12. Verify important claims against retrieved content.
13. Record source provenance.
14. Map references to relevant product units.
15. Search for replacements when coverage is weak.
16. Save and export the library.

## 7.3 Research Modes

- Quick: target 8 references.
- Standard: target 20 references.
- Deep: target 30 references.

Default to Standard.

Never fabricate references merely to reach the target.

## 7.4 Mandatory Seven-Part Knowledge Card

Every accepted source must have:

**A. Title**  
Actual source identity and concise research title.

**B. Description**  
Why the source is relevant to the selected product.

**C. Content Outline**  
Topics actually supported by the retrieved source.

**D. Practical Framework**  
An original actionable application of the supported findings.

**E. Research Summary**  
Accurate, original paraphrase of important source findings.

**F. Editorial Notes**  
How the source should inform chapters, exercises, examples, and worksheets.

**G. Brand Guidelines**  
How to communicate the material using the approved product brand and audience style.

Also save:
- Reference ID.
- Publisher.
- Source URL.
- Author when known.
- Publication date when known.
- Retrieval date.
- Access status.
- Quality score.
- Relevant research pillars.
- Source-backed claims.
- Evidence locations.
- Chapter mappings.
- Research limitations.
- Rights notes.

Distinguish source-derived information from the AI's editorial suggestions.

## 7.5 Verification Status

Use:
- VERIFIED_FULL_TEXT.
- VERIFIED_PARTIAL_TEXT.
- METADATA_ONLY.
- RETRIEVAL_BLOCKED.
- REJECTED_DUPLICATE.
- REJECTED_LOW_QUALITY.
- NEEDS_REVIEW.

Do not label a page as verified if only its search snippet was available.

## 7.6 Automatic Research Gap Repair

If fewer than 20 suitable references are obtained:

1. Identify undercovered research pillars.
2. Generate targeted supplemental queries.
3. Search additional legitimate authoritative sources.
4. Try alternative accessible formats.
5. Replace rejected candidates.
6. Stop after a bounded research budget.
7. Display the true verified total.
8. Preserve missing-coverage warnings.

The reference collector must not get stuck in an infinite search loop.

## 7.7 Reference Reuse

Save research cards so later chapter-generation calls can use them without repeatedly fetching every source.

Keep original source identity for future verification.

Build a chapter-specific source retrieval system to minimize token consumption.

Export the library as:
- Markdown.
- JSON.
- Source index.
- Chapter-to-reference map.

---

# 8. PRODUCT STRATEGY AUTOMATION

Implement the following stages as actual AI generation tasks.

## 8.1 Unique Value Zone

Generate:
- Buyer problems.
- Potential solutions.
- Creator expertise fit.
- Commercial feasibility hypotheses.
- Differentiation opportunities.
- Product positioning alternatives.

Provide three options and select a default recommendation.

## 8.2 Visceral Transformation Map

Generate:
- BEFORE state.
- BRIDGE process.
- AFTER state.
- Emotional motivations.
- Tangible milestones.
- Signature framework.
- Three product title options.
- A credible big promise.
- Pricing positioning.

Show the transformation visually and allow editing.

## 8.3 Product Charter

Combine:
- Topic.
- 13 project fields.
- UVZ.
- Transformation Map.
- Verified references.
- Target audience.
- Brand guidance.

Generate a complete Transformative Product Charter.

Treat the approved charter as the single source of truth for subsequent writing.

## 8.4 Outline Builder

Generate 2–3 alternative product structures.

Examples:
- Compact practical version.
- Comprehensive educational version.
- Toolkit-focused version.

Each chapter or unit must include:
- Title.
- Objective.
- Subtopics.
- Target word count.
- Practical deliverable.
- Supporting reference IDs.
- Examples.
- Completion milestone.

Recommend one outline and allow one-click approval.

Do not require the user to manually construct all chapters.

---

# 9. FULL CONTENT GENERATION ENGINE

This is the most important product-output feature.

The application must generate complete content, not just chapter headings or summaries.

## 9.1 Generation Pipeline

For each unit:

1. Read the approved project brief.
2. Read the Product Charter.
3. Read the transformation map.
4. Read the assigned outline.
5. Retrieve the relevant research cards.
6. Read the Product Bible.
7. Read necessary previous-chapter continuity summaries.
8. Generate substantive original content.
9. Validate section coverage.
10. Validate target depth.
11. Audit important factual claims and citations.
12. Save the output.
13. Update actual word count.
14. Update continuity notes.
15. Continue to the next unit.

## 9.2 Chapter Contents

Include, when appropriate:
- Opening purpose.
- Explanations.
- Step-by-step methods.
- Examples.
- Practical implementation.
- Common mistakes.
- Troubleshooting.
- Exercises.
- Action checklists.
- Key takeaways.
- Supporting citations.

Do not inflate word count with filler.

## 9.3 Content Length

Support:
- Short: approximately 3,000–7,000 words.
- Standard: approximately 8,000–20,000 words.
- Extended: approximately 20,000–40,000 words.
- Custom target.

These are editorial targets.

Break large tasks into smaller calls as needed.

Save checkpoints after each successful unit.

## 9.4 Product Bible

Store:
- Product title.
- Audience.
- Central promise.
- Signature framework.
- Brand voice.
- Terminology.
- Completed chapters.
- Concepts already introduced.
- Examples already used.
- Reference mappings.
- Unresolved factual issues.
- Next-chapter handoff notes.

Do not depend on hidden model memory to maintain continuity.

## 9.5 Content Controls

Create working actions:
- Generate All.
- Generate Chapter.
- Pause.
- Resume.
- Retry.
- Rewrite Section.
- Expand Section.
- Improve Examples.
- Add Exercise.
- Lock Content.
- Save Version.

Preserve user-approved content across regeneration and model changes.

---

# 10. WORKBOOK AND BONUS GENERATION

Automatically propose and generate appropriate companion materials.

Examples:
- Printable worksheets.
- Checklists.
- Trackers.
- Planning calendars.
- Budget sheets.
- Templates.
- Implementation schedules.
- Quick-reference guides.
- Reflection exercises.
- Bonus workbooks.

Each resource must have:
- Purpose.
- Instructions.
- Usable fields.
- Relevant examples.
- Completion criteria.
- Connection to the main product.

Generate resources according to customer value rather than arbitrary quantity.

---

# 11. QUALITY ASSURANCE ENGINE

Run automated checks for:
- Completeness.
- Evidence grounding.
- Structural consistency.
- Repetition.
- Practical usefulness.
- Unverified claims.
- Source mismatch.
- Audience suitability.
- Brand consistency.
- Copyright and attribution.
- Safety risks.
- Missing deliverables.
- Broken references.
- Incorrect calculations.

Classify issues:
- CRITICAL.
- MAJOR.
- MINOR.

Support localized repairs.

Do not rewrite locked content silently.

A product may pass software-generation tests while still requiring external expert or real-world validation.

Never describe untested recipes as physically tested or unreviewed medical content as professionally approved.

Show final status:
- Draft Complete.
- Needs Verification.
- Needs User Review.
- Ready for Export.
- Publication Review Complete, only when genuinely justified.

---

# 12. BRAND DESIGN AND EXPORT

Use the approved Brand Style and Voice settings.

Generate:
- Cover design brief.
- Consistent palette.
- Typography system.
- Chapter styling.
- Workbook layouts.
- Header/footer rules.
- Styled manuscript.

Provide actual export files.

Mandatory:
- Full manuscript Markdown.
- Reference Library Markdown.
- Reference Library JSON.
- Product Charter.
- Approved outline.
- Companion resources.
- Project JSON backup.

Where genuinely supported:
- Styled HTML.
- Print-ready PDF.
- DOCX.
- ZIP product package.

Do not display a working export button if it cannot create a real file.

When exporting partial content, label it incomplete.

---

# 13. PRICING AND LAUNCH AUTOMATION

Use current accessible comparable prices when available.

Generate:
- Standard price recommendation.
- Introductory test price.
- Premium bundle option.
- Pricing rationale.
- Sales page.
- Product description.
- FAQ.
- Lead magnet concept.
- Five-email launch sequence.
- Social post suggestions.
- Thirty-day launch plan.

Do not invent sales, customer testimonials, scarcity, or earnings.

Publication or payment-related external actions require explicit user authorization.

---

# 14. OPENROUTER API — MANDATORY INTEGRATION

This module is a first-class requirement, not an optional future enhancement.

## 14.1 Settings Screen

Create:

**AI Model & API Settings**

Required controls:
- AI Provider dropdown.
- OpenRouter selection.
- API Key input.
- Show/Hide Key.
- Test Connection.
- Save/Update Key.
- Replace Key.
- Disconnect.
- Delete Credential.
- Refresh Models.
- Free Models Only.
- Selected Model.
- Fallback Models.
- Stage-Specific Models.
- Usage Dashboard.

## 14.2 Security

Use a secure server-side proxy when available.

The frontend should not embed or export private API keys.

Store credentials in an appropriate encrypted backend or secret manager.

Never:
- Commit keys to source code.
- Send keys in URL query parameters.
- Expose keys in logs.
- Include keys in project JSON exports.
- Claim client-side browser storage is equivalent to secure server-side credential management.

If only Gemini Canvas client-side execution is available, clearly explain the security limitation and require a backend integration for production use.

## 14.3 Official OpenRouter API Integration

Use the current OpenRouter API documentation.

Base URL:
`https://openrouter.ai/api/v1`

Model discovery:
`GET /models`

Current API key information:
`GET /key`

Chat completion:
`POST /chat/completions`

Actual requests must be made with valid authentication through a suitable runtime.

Do not use invented endpoints.

## 14.4 Dynamic Model Selection

Load model IDs dynamically from the provider.

Support:
- Searchable model list.
- Free Only filter.
- Model pricing information.
- Context-window compatibility.
- Output token capacity.
- Supported capabilities.
- Manual model selection.
- Automatic model selection.
- Per-stage model settings.

Default strategy:
- OpenRouter provider.
- Free Only enabled.
- `openrouter/free` when suitable.
- Paid fallback disabled.

Do not hardcode an old list of free model IDs.

## 14.5 Free Models and Rate Limits

Free model use is rate limited and may depend on account status.

Do not promise unlimited free requests.

Implement:
- Request counting.
- Known usage monitoring.
- Rate-limit error detection.
- Exponential backoff with reasonable caps.
- Provider retry guidance.
- Non-destructive pause/resume.
- Free-model fallback when actually available and permitted.

Different free model IDs do not necessarily bypass account-level limits.

Do not implement account or key rotation intended to circumvent platform rate limits.

If paid fallback is disabled, never silently select a paid model.

## 14.6 Paid Fallback

Allow paid models only after the user explicitly enables them.

If enabled, require configurable:
- Maximum spend per request.
- Daily budget.
- Project budget.
- Alert threshold.
- Automatic stop conditions.

Display estimated usage and actual charges where available.

Do not invent exact quota remaining when the provider does not expose it.

## 14.7 Per-Stage Model Routing

Allow models to be assigned to:
- Market analysis.
- Topic comparison.
- 13-field generation.
- UVZ.
- Transformation mapping.
- Reference summaries.
- Charter.
- Outline.
- Long-form writing.
- Workbook generation.
- Quality audit.
- Pricing and marketing.

A model switch must preserve project content and approved decisions.

Before routing a stage, verify required capabilities.

## 14.8 Provider Abstraction

Implement an interface such as:

```ts
interface AIProvider {
  listModels(): Promise<ModelInfo[]>;
  testConnection(): Promise<ConnectionStatus>;
  generateText(input: GenerationRequest): Promise<GenerationResult>;
  generateStructured(input: StructuredRequest): Promise<unknown>;
  getUsage(): Promise<UsageStatus>;
}
```

Separate the AI provider from:
- Market search.
- Webpage retrieval.
- Document extraction.
- Data persistence.
- Export rendering.

OpenRouter model access alone does not guarantee live marketplace research or webpage extraction.

## 14.9 Model Failure Recovery

On API failure:
1. Preserve the current checkpoint.
2. Record the error type.
3. Check whether a permitted compatible model is available.
4. Retry only within configured limits.
5. Avoid replacing already approved results.
6. Stop gracefully if the account quota is exhausted.
7. Offer a resume action.

---

# 15. WORKFLOW ORCHESTRATOR AND PERSISTENCE

Use a central workflow state machine.

Status values:
- NOT_STARTED.
- READY.
- QUEUED.
- RUNNING.
- NEEDS_REVIEW.
- PARTIAL.
- COMPLETED.
- PAUSED.
- FAILED.
- BLOCKED.

Every generation stage must:
1. Validate prerequisites.
2. Read approved project context.
3. Select a compatible model.
4. Execute a real task.
5. Validate output.
6. Save results.
7. Update progress.
8. Record errors.
9. Unlock subsequent stages.

Implement durable checkpoints where the environment supports them.

## 15.1 Dependency Rules

Topic selection triggers:
- Project intake generation.
- Automatic reference discovery.

UVZ and transformation may proceed when enough project context exists.

Product Charter requires:
- Approved topic.
- Core intake.
- Transformation.
- Appropriate available research coverage.

Detailed writing requires:
- Approved Charter.
- Approved outline.
- Relevant research context.

Final QA requires the generated product content.

Do not falsely report fully completed exports if required chapters are missing.

## 15.2 Change Propagation

If the user changes:
- Topic: invalidate dependent research and downstream outputs.
- Target audience: review positioning, references, charter, and content.
- Product format: rebuild format-dependent sections.
- Chapter outline: update affected chapters and resources.
- Brand: update design and presentation without unnecessarily rewriting factual content.

Preserve previous versions where feasible.

## 15.3 Background Jobs

If durable workers are available:
- Use a queue.
- Track job IDs.
- Checkpoint work.
- Support pause/resume.
- Handle retries.
- Persist results.

If the runtime cannot execute long-running background jobs:
- Run bounded foreground batches.
- Save checkpoints.
- Provide a clear Continue action.

Never claim that unfinished work will continue autonomously if the runtime cannot support it.

---

# 16. BACKEND INTERFACES

Provide an organized backend API design.

Suggested route groups:

```text
/projects
/projects/:id
/projects/:id/research
/projects/:id/topics
/projects/:id/intake
/projects/:id/references
/projects/:id/uvz
/projects/:id/transformation
/projects/:id/charter
/projects/:id/outline
/projects/:id/chapters
/projects/:id/resources
/projects/:id/quality
/projects/:id/brand
/projects/:id/pricing
/projects/:id/exports

/ai/credentials
/ai/connection/test
/ai/models
/ai/preferences
/ai/usage

/jobs
/jobs/:id
/jobs/:id/pause
/jobs/:id/resume
```

These are interfaces to implement, not endpoints assumed to already exist.

Require:
- Request schema validation.
- Authentication when multi-user.
- Project-level authorization.
- Secure credential management.
- Rate limiting.
- Idempotent job operations.
- Bounded retries.
- Clear error responses.

---

# 17. DATA MODEL REQUIREMENTS

Use the V4.0 specification's structured project model as the starting point.

Include these entities:

- UserPreferences.
- Project.
- MarketResearchRun.
- MarketplaceObservation.
- TopicCandidate.
- TopicSelection.
- ProjectIntake.
- UVZAnalysis.
- TransformationMap.
- ReferenceResearchRun.
- ResearchSource.
- ReferenceCard.
- ClaimEvidence.
- ProductCharter.
- OutlineUnit.
- ProductBible.
- Chapter.
- ResourceAsset.
- QualityIssue.
- BrandProfile.
- PricingReport.
- SalesAsset.
- WorkflowJob.
- ExportManifest.
- AIProviderConfiguration.
- CredentialReference.
- UsageRecord.

Use stable IDs and versioned records.

Secrets must not be stored inside project export objects.

For large documents, do not require the entire manuscript and all 20 sources to reside in one frontend state object.

---

# 18. SECURITY AND DATA INTEGRITY

Implement relevant protections:
- HTTPS for production.
- Backend credential storage.
- Authentication and authorization.
- Safe remote URL retrieval.
- SSRF prevention.
- File-size limits.
- File-type validation.
- Output HTML sanitization.
- Prompt-injection resistance.
- Safe logging.
- Secure exports.
- Data isolation between users.
- API cost limits.
- Source copyright awareness.

Treat all web pages and uploaded documents as untrusted data.

A reference page may contribute factual content but cannot override application instructions.

Do not reproduce entire paid books or copyrighted materials without authorization.

For sensitive domains, include the appropriate verification and professional review requirements.

---

# 19. BUILD ORDER — IMPLEMENT IN VERTICAL SLICES

Do not attempt to implement the entire product as one untested monolithic component.

## Phase 1 — Core Application Foundation

Build:
- Functional dashboard.
- Routing.
- Project creation.
- Shared state.
- Project save/load.
- Basic editing.
- Exportable JSON/Markdown.
- Stage progress model.

Acceptance:
A user can create, save, reopen, and export a project.

## Phase 2 — OpenRouter Integration

Build:
- Credential settings UI.
- Secure provider adapter.
- Test Connection.
- Dynamic model list.
- Free-model filtering.
- Selected model persistence.
- Real text generation.
- Errors and rate-limit handling.

Acceptance:
An authenticated model call returns genuine generated content that is saved in the project.

## Phase 3 — Market Research and Topic Selection

Build:
- Real research provider adapter.
- Marketplace evidence model.
- Opportunity scoring.
- Topic recommendation cards.
- Topic approval.

Acceptance:
A user can inspect evidence and select an actual generated topic recommendation.

If no research service is configured, clearly display the blocker rather than simulate live research.

## Phase 4 — Automatic Reference Collection

Build:
- Topic-triggered reference job.
- Query generator.
- Source discovery.
- Retrieval.
- Deduplication.
- Quality evaluation.
- Seven-part card generation.
- Evidence validation.
- Reference Library dashboard.

Acceptance:
Selecting a topic produces genuinely retrieved and properly labeled research cards without manually entering URLs.

Test with a smaller source target first, then expand to the 20-source default.

## Phase 5 — Strategy and Structure

Build:
- 13-field generation.
- UVZ.
- Transformation Map.
- Product Charter.
- Outline options.
- Approvals and lock controls.

Acceptance:
The approved project strategy remains internally consistent.

## Phase 6 — Content Factory

Build:
- Complete chapter generation.
- Product Bible.
- Citation mapping.
- Workbook generation.
- Editing.
- Save checkpoints.
- Pause/resume.

Acceptance:
At least one complete chapter can be generated from real stored project context, then the full workflow can process all units.

## Phase 7 — QA, Design, and Exports

Build:
- Quality audit.
- Issue repair.
- Branded formatting.
- Markdown export.
- HTML export.
- Other supported file formats.

Acceptance:
An actual downloadable manuscript contains complete current project content.

## Phase 8 — Monetization and Production Reliability

Build:
- Pricing.
- Sales materials.
- Launch plan.
- Monitoring.
- Cost controls.
- Multi-project persistence.
- Production security.

Acceptance:
Commercial assets reflect the actual finished product and verified evidence.

---

# 20. ACCEPTANCE TESTS — MUST BE EXECUTED

Do not claim a feature is finished solely because code has been written.

Test actual behavior.

## 20.1 Application

- New project creation works.
- Navigation works.
- User selections update state.
- Project save works.
- Project restore works.
- Locked edits persist.
- Errors are visible.

## 20.2 OpenRouter

- API Key can be entered.
- Test Connection checks a real endpoint.
- Invalid credentials produce an error.
- Models are actually retrieved.
- Free Only filter works.
- A real model returns content.
- Model selection changes the active provider request.
- Switching models preserves project context.
- Rate-limit responses are handled.
- Paid fallback never activates without permission.

## 20.3 Market Research

- A connected source produces real evidence.
- Dates and marketplace identities are recorded.
- Rankings are not confused with unranked listings.
- Unsupported sales statistics are not generated.
- Recommendation cards contain actual evidence when available.
- Topic selection triggers downstream state changes.

## 20.4 Automatic References

- Topic selection triggers the collection workflow.
- Duplicate sources are rejected.
- Failed retrieval is reported.
- Source access status is accurate.
- Reference cards contain all seven sections.
- Source-backed claims preserve provenance.
- Actual verified count is displayed.
- Reference Library can be exported.
- Weak sources can be replaced.
- Missing research coverage is reported.

## 20.5 Product Generation

- All 13 fields generate.
- UVZ uses selected topic.
- Transformation uses approved audience.
- Charter follows approved inputs.
- Outline maps sources to chapters.
- Full chapter content is substantive.
- Actual word count is computed.
- Product Bible preserves continuity.
- Worksheets are usable.
- User edits are retained.

## 20.6 Quality and Export

- Quality audit detects missing or unsupported content.
- Critical issues block publication-ready claims.
- Markdown export works.
- Export contains actual chapters.
- Project JSON backup works.
- Missing resources are identified.
- A failed stage does not erase prior work.

## 20.7 Automation

- Autopilot advances through valid dependencies.
- Approval gates work.
- Pause/resume works where supported.
- An unavailable API produces a recoverable error.
- Progress represents actual completed work.
- No fake completion messages appear.

---

# 21. PRIMARY DEMONSTRATION PROJECT

Use the following project to validate the app.

**Project:** Budget Family Meal Planning  
**Brand:** The Smart Family Table  
**Product:** 28-Day Budget Family Meal Plan  
**Subtitle:** Affordable Dinners, Smarter Grocery Shopping & Less Food Waste  
**Audience:** Busy US families of approximately 3–5 people  
**Format:** Ebook + Printable Toolkit  
**Historical Regular Price Hypothesis:** USD 14.99

Expected research categories:
- Family meal planning.
- Affordable recipes.
- Grocery budgeting.
- Food waste reduction.
- Ingredient pricing.
- Nutrition composition.
- Allergen information.
- Cooking safety.
- Food storage.
- Meal preparation.

Expected deliverables:
- Up to 20 verified research cards.
- All 13 intake fields.
- UVZ.
- Transformation Map.
- Product Charter.
- Full outline.
- Twenty-eight draft dinner recipes.
- Four weekly dinner schedules.
- Four consolidated shopping lists.
- Grocery budget tracker.
- Pantry inventory.
- Food waste tracker.
- Ingredient substitution guide.
- Quality report.
- Styled manuscript.
- Actual downloadable files.

**Important:**
Recipes generated by AI must not be described as kitchen-tested without real testing.

Ingredient-cost figures must be dated and based on actual data or clearly marked illustrative estimates.

A dinner-only budget must not be represented as the entire household's weekly food budget.

---

# 22. REQUIRED ENGINEERING DELIVERABLES

When the environment supports code artifacts, produce:

1. Actual source code.
2. Application component structure.
3. Backend API handlers.
4. AI provider adapter.
5. Research provider integration.
6. Reference collection service.
7. Workflow orchestrator.
8. Database schema or storage model.
9. Export functions.
10. Validation logic.
11. Automated or repeatable test cases.
12. Environment configuration template without real secrets.
13. Deployment guidance.
14. Operation instructions.

For production-oriented code, include:
- README.
- Dependency manifest.
- Configuration instructions.
- Example environment-variable names.
- Database setup or migration instructions.
- Test commands.
- Build commands.
- Deployment considerations.

Do not invent successful build or deployment results.

---

# 23. EXECUTION DISCIPLINE

As you build:

1. Preserve the existing code when iterating.
2. Implement one coherent functional slice at a time.
3. Reuse components.
4. Avoid duplicated state.
5. Avoid obsolete APIs.
6. Check current provider documentation when needed.
7. Validate structured model responses.
8. Avoid hardcoded sample data outside clearly labeled test fixtures.
9. Test critical actions after changes.
10. Preserve completed project data.
11. Report blockers accurately.
12. Continue with the next highest-priority implementation step when possible.

Do not turn every development stage into a new request for manual instructions.

Make reasonable technical defaults.

Only ask for essential user secrets, external account authorization, or decisions that cannot safely be assumed.

---

# 24. FINAL ENGINEERING REPORT FORMAT

After implementing as much as the environment supports, provide a concise engineering report.

## A. Implemented and Tested
List only features actually implemented and successfully tested.

## B. Implemented but Not Yet Connected
Identify functions needing:
- API Key.
- Search service.
- Backend.
- Database.
- Deployment.
- Additional permissions.

## C. Incomplete or Blocked
Identify missing features and their blockers.

## D. Test Results
Report:
- Test name.
- Pass/fail/not run.
- Relevant evidence.
- Known limitations.

## E. Operating Instructions
Explain:
- How to open the app.
- How to enter the OpenRouter API Key.
- How to select a free model.
- How to start a new product project.
- How to review topic recommendations.
- How to launch automatic reference collection.
- How to continue product generation.
- How to export files.

## F. Next Development Priority
State the single most important missing capability to implement next.

Do not claim the application is production-ready without passing relevant tests.

---

# 25. FINAL EXECUTION COMMAND

**BEGIN IMPLEMENTATION NOW.**

Read the entire attached V4.0 specification.

Use this prompt as the implementation and quality-control instruction.

Build a genuinely interactive and functional **Digital Product Creator 2.0** application.

Prioritize this working vertical slice:

**OpenRouter Connection → Real AI Generation → Market Research → Topic Selection → Automatic Reference Collection → 13 Fields → UVZ → Transformation → Charter → Outline → One Complete Chapter → Save → Export.**

After this vertical slice works, expand the application to full multi-chapter product generation, workbooks, quality review, design, pricing, and launch planning.

Do not stop after producing a plan.

Do not stop after rendering a static dashboard.

Do not provide fake research, fake AI output, fake API connection states, or fake downloads.

Use available development tools to write and revise executable application code.

If the current runtime cannot support a required feature, implement the supported portion, explain the external dependency, and produce a clear integration contract. Do not silently substitute a simulated implementation.

Focus on minimizing user input through suggested options, one-click approval, persistent project context, and reliable automation.

Use **Budget Family Meal Planning** as the acceptance-test project.

Report which features work, which are blocked, and what must be configured.

## Final Product Vision

A user opens the application, chooses from AI-researched digital product opportunities, approves a suggested direction, and lets the system perform the research, strategy, content generation, resource creation, quality assessment, and product assembly.

The result is an original, practical, properly sourced, editable, and exportable digital product.

OpenRouter provides flexible model selection and free-first execution without promising unlimited usage or bypassing provider restrictions.

**BUILD THE FUNCTIONAL APPLICATION. TEST REAL BEHAVIOR. REPORT RESULTS TRUTHFULLY.**

---

# End of prompt.md
