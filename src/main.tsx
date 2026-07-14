import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QuizProvider } from './state/QuizContext';
import { accountingConfig } from './config/industries/accounting';
import { App } from './App';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QuizProvider config={accountingConfig}>
      <App />
    </QuizProvider>
  </StrictMode>,
);
