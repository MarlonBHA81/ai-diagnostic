import type { IndustryConfig } from '../IndustryConfig';

/**
 * Generic Business Edition — the base vertical, ported verbatim from the
 * prototype (7zonediagnosticquiz). Zones, dimension options, next-step copy,
 * and the Simkin quote are exactly as in the prototype. The app's framework
 * additions (lead-capture gate, multi-currency, Story Advantage branding) wrap
 * this generic copy.
 */
export const genericConfig: IndustryConfig = {
  slug: 'generic',
  sourceTag: 'business-diagnostic',
  displayName: 'Business',

  welcome: {
    headline: 'Where should AI go **first** in your business?',
    subhead:
      "Score seven zones of your business across five dimensions. The math will point at your binding constraint — the one bottleneck limiting the whole system. Answer with what's actually happening, not what you wish were happening. Roughly 10–15 minutes.",
  },

  baseline: {
    revenueLabel: 'Monthly revenue',
    teamSizeLabel: 'Team size',
    chargeOutRateLabel: 'Your blended hourly rate',
    chargeOutRateNote: 'Optional — used to estimate the monthly cost of your constraint.',
    busySeasonNote: '',
  },

  dimensions: {
    hoursLabel: 'Time consumed',
    hoursHint:
      "Total hours per week your business (you + team) spends in this zone. Give a real number — “a lot” doesn't score.",

    repetitivenessLabel: 'Repetitiveness',
    repetitivenessHint:
      '1 = entirely creative, different every time · 5 = highly repetitive, pattern-based, process-driven.',
    repetitivenessCaps: ['Creative', '', 'Mixed', '', 'Repetitive'],

    aiUsageLabel: 'Current AI usage',
    aiUsageHint: "Be honest — subscriptions you own but don't use don't count.",
    aiUsageOptions: [
      { value: 1, label: 'None', description: 'No AI tools or systems in this zone' },
      { value: 2, label: 'Basic', description: 'Occasional tasks — e.g. ChatGPT for drafts' },
      { value: 3, label: 'Moderate', description: 'Integrated into regular workflows, saving measurable time' },
      { value: 4, label: 'Advanced', description: 'Load-bearing — processes redesigned around AI' },
    ],

    marginImpactLabel: 'Margin impact',
    marginImpactHint: 'How much does this zone affect profitability?',
    marginImpactOptions: [
      { value: 1, label: 'Low', description: 'Minimal effect on profitability' },
      { value: 2, label: 'Medium', description: 'Improvements would noticeably improve margins' },
      { value: 3, label: 'High', description: 'Directly drives margin — changes here move the P&L' },
      { value: 4, label: 'Critical', description: 'This is where margin lives or dies' },
    ],

    partnerInvolvementLabel: 'Owner involvement',
    partnerInvolvementHint:
      '1 = you never touch this zone · 5 = nothing moves without you.',
    partnerInvolvementCaps: ['Never', '', 'Shared', '', "I'm the bottleneck"],
  },

  zones: [
    {
      id: 'lead',
      name: 'Lead Generation',
      description: 'How you attract potential customers — ads, content, SEO, referrals, partnerships.',
      thinkExample: 'Think: ads, content, SEO, referrals, partnerships.',
      freeText: [
        { key: 'bottleneck', label: "What's the biggest bottleneck in this zone?", placeholder: 'e.g. Nothing ships without my review…' },
        { key: 'desiredFix', label: 'If you could fix one thing here with AI, what would it be?', placeholder: 'e.g. Drafts good enough to publish without my review…' },
      ],
    },
    {
      id: 'sales',
      name: 'Sales',
      description: 'How leads become customers — qualification, follow-up, proposals, closing.',
      thinkExample: 'Think: qualification, follow-up, proposals, closing.',
      freeText: [
        { key: 'bottleneck', label: "What's the biggest bottleneck in this zone?", placeholder: 'e.g. Nothing ships without my review…' },
        { key: 'desiredFix', label: 'If you could fix one thing here with AI, what would it be?', placeholder: 'e.g. Drafts good enough to publish without my review…' },
      ],
    },
    {
      id: 'delivery',
      name: 'Delivery',
      description: 'How you deliver what you sold — calls, creative work, services, products.',
      thinkExample: 'Think: calls, creative work, services, products.',
      freeText: [
        { key: 'bottleneck', label: "What's the biggest bottleneck in this zone?", placeholder: 'e.g. Nothing ships without my review…' },
        { key: 'desiredFix', label: 'If you could fix one thing here with AI, what would it be?', placeholder: 'e.g. Drafts good enough to publish without my review…' },
      ],
    },
    {
      id: 'ops',
      name: 'Operations',
      description: 'The machinery that keeps everything running — project management, internal comms, reporting, scheduling, admin.',
      thinkExample: 'Think: project management, internal comms, reporting, scheduling, admin.',
      freeText: [
        { key: 'bottleneck', label: "What's the biggest bottleneck in this zone?", placeholder: 'e.g. Nothing ships without my review…' },
        { key: 'desiredFix', label: 'If you could fix one thing here with AI, what would it be?', placeholder: 'e.g. Drafts good enough to publish without my review…' },
      ],
    },
    {
      id: 'finance',
      name: 'Finance',
      description: 'Invoicing, expense management, forecasting, cash flow.',
      thinkExample: 'Think: invoicing, expense management, forecasting, cash flow.',
      freeText: [
        { key: 'bottleneck', label: "What's the biggest bottleneck in this zone?", placeholder: 'e.g. Nothing ships without my review…' },
        { key: 'desiredFix', label: 'If you could fix one thing here with AI, what would it be?', placeholder: 'e.g. Drafts good enough to publish without my review…' },
      ],
    },
    {
      id: 'team',
      name: 'Team',
      description: 'Hiring, onboarding, training, management.',
      thinkExample: 'Think: hiring, onboarding, training, management.',
      freeText: [
        { key: 'bottleneck', label: "What's the biggest bottleneck in this zone?", placeholder: 'e.g. Nothing ships without my review…' },
        { key: 'desiredFix', label: 'If you could fix one thing here with AI, what would it be?', placeholder: 'e.g. Drafts good enough to publish without my review…' },
      ],
    },
    {
      id: 'owner',
      name: 'Owner',
      description: 'Strategy, vision, architecture — the thinking work that decides where the whole thing goes.',
      thinkExample: 'Think: strategy, vision, architecture — the work that decides where the whole thing goes.',
      freeText: [
        { key: 'bottleneck', label: "What are you spending time on that isn't architecture, strategy, or vision?", placeholder: 'e.g. Approving every deliverable, chasing status updates…' },
        { key: 'desiredFix', label: 'What would you do with 10 extra hours per week?', placeholder: 'e.g. Build the new offer, partnerships, actual strategy…' },
      ],
    },
  ],

  nextSteps: {
    contextLibrary: {
      heading: 'No AI usage in this zone',
      body: 'Build your context library first (Context Library Blueprint), then deploy AI to the highest-volume repetitive task in this zone. Then run the Constraint Identification worksheet to validate and dollarise the bottleneck, followed by the Buy / Build / Wait matrix.',
      firmExample: '',
    },
    redesign: {
      heading: 'Basic AI usage in this zone',
      body: "You've added tools but haven't redesigned the workflow. Ask: “If I were building this zone today from scratch, what would it look like?” Then redesign it — don't optimise the old process. Then run the Constraint Identification worksheet to validate and dollarise the bottleneck, followed by the Buy / Build / Wait matrix.",
      firmExample: '',
    },
    integrate: {
      heading: 'Moderate AI usage in this zone',
      body: "You're partway there. The next step is integration — connect this zone's AI systems to the rest of your business so data flows and compounds. Then run the Constraint Identification worksheet to validate and dollarise the bottleneck, followed by the Buy / Build / Wait matrix.",
      firmExample: '',
    },
    constraintShifted: {
      heading: 'Advanced AI usage in this zone',
      body: 'This zone is already AI-first — your binding constraint has shifted. Repeat the process on your second-highest scoring zone. Then run the Constraint Identification worksheet to validate and dollarise the bottleneck, followed by the Buy / Build / Wait matrix.',
      firmExample: '',
    },
  },

  closing: {
    quote:
      'Identify the binding constraint. Apply AI to it with proper context and documentation. Verify that the constraint is solved. Identify the new constraint that has emerged. Repeat.',
    quoteAttribution: 'Benjamin Simkin, The AI First Company',
    reRunNote: 'Re-run this every 90 days and compare.',
    ctaText: 'Book your AI Automations Debrief',
    ctaUrl: 'https://link.storyadvantage.co.za/widget/bookings/ai-automations-debrief',
  },
};

export default genericConfig;
