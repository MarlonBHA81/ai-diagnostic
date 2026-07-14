import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QuizProvider } from './state/QuizContext';
import { activeConfig } from './config/active';
import { App } from './App';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QuizProvider config={activeConfig}>
      <App />
    </QuizProvider>
  </StrictMode>,
);
