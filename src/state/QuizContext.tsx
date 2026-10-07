import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import { DEFAULT_CURRENCY } from '../currency/currency';
import type { IndustryConfig } from '../config/IndustryConfig';
import {
  emptyAnswer,
  type Baseline,
  type LeadDetails,
  type QuizState,
  type Step,
  type ZoneAnswerState,
} from './types';

type Action =
  | { type: 'SET_LEAD'; lead: LeadDetails; startedAt: number }
  | { type: 'MARK_LEAD_CAPTURED' }
  | { type: 'SET_BASELINE'; patch: Partial<Baseline> }
  | { type: 'SET_ANSWER'; zoneId: string; patch: Partial<ZoneAnswerState> }
  | { type: 'GO'; step: Step }
  | { type: 'RESTART' };

function initialState(config: IndustryConfig): QuizState {
  const answers: Record<string, ZoneAnswerState> = {};
  for (const z of config.zones) answers[z.id] = emptyAnswer();
  return {
    step: 'welcome',
    lead: null,
    baseline: {
      currency: DEFAULT_CURRENCY,
      monthlyRevenue: null,
      teamSize: null,
      chargeOutRate: null,
    },
    answers,
    startedAt: null,
    leadCaptured: false,
  };
}

function reducer(state: QuizState, action: Action): QuizState {
  switch (action.type) {
    case 'SET_LEAD':
      return { ...state, lead: action.lead, startedAt: action.startedAt };
    case 'MARK_LEAD_CAPTURED':
      return { ...state, leadCaptured: true };
    case 'SET_BASELINE':
      return { ...state, baseline: { ...state.baseline, ...action.patch } };
    case 'SET_ANSWER':
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.zoneId]: { ...state.answers[action.zoneId], ...action.patch },
        },
      };
    case 'GO':
      return { ...state, step: action.step };
    case 'RESTART':
      return {
        ...initialState(contextConfig!),
      };
    default:
      return state;
  }
}

// The active config is captured so RESTART can rebuild answers. Set on provider mount.
let contextConfig: IndustryConfig | null = null;

interface QuizContextValue {
  config: IndustryConfig;
  state: QuizState;
  setLead: (lead: LeadDetails, startedAt: number) => void;
  markLeadCaptured: () => void;
  setBaseline: (patch: Partial<Baseline>) => void;
  setAnswer: (zoneId: string, patch: Partial<ZoneAnswerState>) => void;
  go: (step: Step) => void;
  restart: () => void;
}

const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({
  config,
  children,
}: {
  config: IndustryConfig;
  children: ReactNode;
}) {
  contextConfig = config;
  const [state, dispatch] = useReducer(reducer, config, initialState);

  const value = useMemo<QuizContextValue>(
    () => ({
      config,
      state,
      setLead: (lead, startedAt) => dispatch({ type: 'SET_LEAD', lead, startedAt }),
      markLeadCaptured: () => dispatch({ type: 'MARK_LEAD_CAPTURED' }),
      setBaseline: (patch) => dispatch({ type: 'SET_BASELINE', patch }),
      setAnswer: (zoneId, patch) => dispatch({ type: 'SET_ANSWER', zoneId, patch }),
      go: (step) => dispatch({ type: 'GO', step }),
      restart: () => dispatch({ type: 'RESTART' }),
    }),
    [config, state],
  );

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz(): QuizContextValue {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error('useQuiz must be used within a QuizProvider');
  return ctx;
}
