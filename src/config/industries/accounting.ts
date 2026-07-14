import type { IndustryConfig } from '../IndustryConfig';

/**
 * Accounting Firm Edition — vertical #1 (route: /accounting).
 *
 * Structure, scoring, results layout, dimension options, next-step logic, and
 * the Simkin quote are ported from the prototype worksheet. The two deliberate
 * changes from the prototype are baked in elsewhere (lead capture up front;
 * multi-currency). The accounting-specific copy — zone descriptions, "Think:"
 * lines, AI-usage descriptions, "Partner involvement" terminology, the busy-
 * season note, and the charge-out-rate label — is the accounting adaptation of
 * the generic prototype, written in the Story Advantage voice (plain, direct,
 * customer-is-the-hero, no hype).
 */
export const accountingConfig: IndustryConfig = {
  slug: 'accounting',
  sourceTag: 'accounting-diagnostic',
  displayName: 'Accounting Firm',

  welcome: {
    headline: 'Where should AI go **first** in your firm?',
    subhead:
      "Score seven zones of your firm across five dimensions. The math points to your binding constraint — the one bottleneck to fix first. It takes about 10–15 minutes, and we'll email your full report when you're done.",
  },

  baseline: {
    revenueLabel: 'Monthly fee revenue',
    teamSizeLabel: 'Team size (partners + staff)',
    chargeOutRateLabel: 'Blended charge-out rate',
    chargeOutRateNote:
      'Optional. Per hour, in the currency above. We use it to price your constraint in billable-equivalent capacity.',
    busySeasonNote:
      'Give hours as a realistic annual average, with tax/busy season weighted in — not a quiet-month snapshot.',
  },

  dimensions: {
    hoursLabel: 'Time consumed',
    hoursHint:
      "Total hours per week the firm (partners + staff) spends in this zone. Give a real number — “a lot” doesn't score.",

    repetitivenessLabel: 'Repetitiveness',
    repetitivenessHint:
      '1 = bespoke, different every time · 5 = highly process-driven and pattern-based.',
    repetitivenessCaps: ['Bespoke', '', 'Mixed', '', 'Process-driven'],

    aiUsageLabel: 'Current AI usage',
    aiUsageHint: "Be honest — subscriptions you own but don't use don't count.",
    aiUsageOptions: [
      { value: 1, label: 'None', description: 'No AI tools or systems in this part of the firm.' },
      { value: 2, label: 'Basic', description: 'Occasional use — e.g. ChatGPT to draft a client email or explain a rule.' },
      { value: 3, label: 'Moderate', description: 'Built into regular workflows and saving measurable time — e.g. AI-assisted queries, drafting, or data cleanup.' },
      { value: 4, label: 'Advanced', description: 'Load-bearing — the process has been redesigned around AI (automated prep, extraction, or review).' },
    ],

    marginImpactLabel: 'Margin impact',
    marginImpactHint: 'How much does this zone affect the firm’s profitability?',
    marginImpactOptions: [
      { value: 1, label: 'Low', description: 'Minimal effect on firm profitability.' },
      { value: 2, label: 'Medium', description: 'Improvements here would noticeably improve margins.' },
      { value: 3, label: 'High', description: "Directly drives margin — changes here move the firm's P&L." },
      { value: 4, label: 'Critical', description: "This is where the firm's margin lives or dies." },
    ],

    partnerInvolvementLabel: 'Partner involvement',
    partnerInvolvementHint:
      '1 = a partner never touches this zone · 5 = nothing moves without a partner.',
    partnerInvolvementCaps: ['Never', '', 'Shared', '', "I'm the bottleneck"],
  },

  zones: [
    {
      id: 'lead',
      name: 'Lead Generation',
      description:
        'How your firm attracts prospective clients — referrals, your website, content, networking, and partner introductions.',
      thinkExample:
        'Think: referral follow-ups, website enquiries, LinkedIn posts, seminar and webinar invitations, networking with bankers and lawyers.',
      freeText: [
        { key: 'bottleneck', label: "What's the biggest bottleneck in this zone?", placeholder: 'e.g. Referrals come in but nobody follows up consistently…' },
        { key: 'desiredFix', label: 'If you could fix one thing here with AI, what would it be?', placeholder: 'e.g. Draft and schedule the follow-up sequence automatically…' },
      ],
    },
    {
      id: 'sales',
      name: 'Sales & Onboarding',
      description:
        'How a prospect becomes a client — scoping calls, proposals and engagement letters, pricing, and getting them set up in your systems.',
      thinkExample:
        'Think: discovery calls, proposals and quotes, engagement letters, KYC/AML checks, onboarding into practice-management and ledger software.',
      freeText: [
        { key: 'bottleneck', label: "What's the biggest bottleneck in this zone?", placeholder: 'e.g. Every proposal is written from scratch…' },
        { key: 'desiredFix', label: 'If you could fix one thing here with AI, what would it be?', placeholder: 'e.g. Generate the engagement letter and onboarding checklist from the scoping notes…' },
      ],
    },
    {
      id: 'delivery',
      name: 'Client Delivery',
      description:
        'The billable work itself — compliance, accounts, tax returns, bookkeeping, payroll, and advisory.',
      thinkExample:
        'Think: preparing financial statements, tax computations and returns, VAT/BAS, monthly bookkeeping, payroll runs, management accounts, advisory work.',
      freeText: [
        { key: 'bottleneck', label: "What's the biggest bottleneck in this zone?", placeholder: 'e.g. Manual data entry and chasing missing records…' },
        { key: 'desiredFix', label: 'If you could fix one thing here with AI, what would it be?', placeholder: 'e.g. Extract and categorise transactions so staff start from a clean draft…' },
      ],
    },
    {
      id: 'ops',
      name: 'Operations',
      description:
        'The machinery that keeps the firm running — workflow, deadlines, internal comms, document management, and admin.',
      thinkExample:
        'Think: job scheduling and deadline tracking, chasing client records, document collection and filing, practice-management admin, internal status updates.',
      freeText: [
        { key: 'bottleneck', label: "What's the biggest bottleneck in this zone?", placeholder: 'e.g. Deadlines tracked in three different places…' },
        { key: 'desiredFix', label: 'If you could fix one thing here with AI, what would it be?', placeholder: 'e.g. Auto-chase clients for outstanding records and flag jobs at risk…' },
      ],
    },
    {
      id: 'finance',
      name: 'Firm Finance',
      description:
        "Your own firm's money — billing clients, collecting fees, WIP, and cash flow.",
      thinkExample:
        'Think: raising invoices, WIP and time write-offs, debtor chasing, fee collection, firm budgeting and cash-flow forecasting.',
      freeText: [
        { key: 'bottleneck', label: "What's the biggest bottleneck in this zone?", placeholder: 'e.g. WIP sits unbilled for weeks…' },
        { key: 'desiredFix', label: 'If you could fix one thing here with AI, what would it be?', placeholder: 'e.g. Draft invoices from time entries and auto-chase overdue fees…' },
      ],
    },
    {
      id: 'team',
      name: 'Team',
      description:
        'Growing and running the people in the firm — hiring, onboarding, training, reviews, and management.',
      thinkExample:
        'Think: recruiting staff and trainees, onboarding, CPD and training, performance reviews, rostering, workflow allocation.',
      freeText: [
        { key: 'bottleneck', label: "What's the biggest bottleneck in this zone?", placeholder: 'e.g. Onboarding a new hire eats a senior’s week…' },
        { key: 'desiredFix', label: 'If you could fix one thing here with AI, what would it be?', placeholder: 'e.g. A living training library new staff can query…' },
      ],
    },
    {
      id: 'owner',
      name: 'Partner/Owner',
      description:
        'The thinking work only a partner can do — strategy, key client relationships, technical sign-off, and the direction of the firm.',
      thinkExample:
        'Think: final review and sign-off, key client relationships, pricing decisions, firm strategy, deciding which services to build next.',
      freeText: [
        { key: 'bottleneck', label: "What are you spending time on that isn't strategy, relationships, or sign-off?", placeholder: 'e.g. Reviewing every return, chasing status updates…' },
        { key: 'desiredFix', label: 'What would you do with 10 extra hours per week?', placeholder: 'e.g. Build the advisory offer, partner relationships, actual strategy…' },
      ],
    },
  ],

  nextSteps: {
    contextLibrary: {
      heading: 'No AI usage in this zone',
      body: 'Build your context library first — the documented rules, templates, and examples AI needs to do this work your way. Then point AI at the highest-volume repetitive task in this zone.',
      firmExample:
        'In a firm, that looks like: a documented prep checklist and worked examples for a common return type, so AI drafts and staff review — instead of starting from a blank page.',
    },
    redesign: {
      heading: 'Basic AI usage in this zone',
      body: "You've added tools but haven't redesigned the workflow. Ask: “If I were building this zone today from scratch, what would it look like?” Then redesign the process — don't just bolt AI onto the old one.",
      firmExample:
        'In a firm, that looks like: rebuilding the month-end close around AI-assisted extraction and reconciliation, rather than pasting figures into ChatGPT after the fact.',
    },
    integrate: {
      heading: 'Moderate AI usage in this zone',
      body: "You're partway there. The next step is integration — connect this zone's AI to the rest of the firm so data flows and compounds instead of living in one person's chat window.",
      firmExample:
        'In a firm, that looks like: your practice-management, ledger, and drafting tools sharing context, so a client record updates once and flows everywhere.',
    },
    constraintShifted: {
      heading: 'Advanced AI usage in this zone',
      body: 'This zone is already AI-first — your binding constraint has shifted. Repeat the diagnostic on your second-highest-scoring zone and put your leverage there.',
      firmExample:
        'In a firm, that looks like: delivery is largely automated, so the real bottleneck moves upstream — to how fast you can win and onboard the right clients.',
    },
  },

  closing: {
    quote:
      'Identify the binding constraint. Apply AI to it with proper context and documentation. Verify that the constraint is solved. Identify the new constraint that has emerged. Repeat.',
    quoteAttribution: 'Benjamin Simkin, The AI First Company',
    reRunNote: 'Re-run this every 90 days — and again after busy season — and compare.',
    ctaText: 'Book your AI Automations Debrief',
    ctaUrl: 'https://link.storyadvantage.co.za/widget/bookings/ai-automations-debrief',
  },
};

export default accountingConfig;
