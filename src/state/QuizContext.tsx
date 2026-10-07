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
  | { type: 'START'; startedAt: number }
  | { type: 'SET_LEAD'; lead: LeadDetails; honeypot: string }
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
    honeypot: '',
  };
}

function reducer(state: QuizState, action: Action): QuizState {
  switch (action.type) {
    case 'START':
      // Stamp the start time once, when the user begins the quiz.
      return { ...state, startedAt: state.startedAt ?? action.startedAt };
    case 'SET_LEAD':
      return { ...state, lead: action.lead, honeypot: action.honeypot };
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
  start: (startedAt: number) => void;
  setLead: (lead: LeadDetails, honeypot: string) => void;
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
      start: (startedAt) => dispatch({ type: 'START', startedAt }),
      setLead: (lead, honeypot) => dispatch({ type: 'SET_LEAD', lead, honeypot }),
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
