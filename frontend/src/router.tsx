import { createBrowserRouter } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';
import { ObrigadoPage } from '@/pages/ObrigadoPage';

// Rotas: landing de campanha (/) e a página dedicada de pós-pagamento (/obrigado).
// /obrigado é o destino da success_url da Stripe — só exibe agradecimento, sem
// efeito colateral (cadastro no Brevo acontece via webhook no backend).
export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/obrigado', element: <ObrigadoPage /> },
]);
