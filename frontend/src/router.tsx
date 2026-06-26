import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';
import { ObrigadoPage } from '@/pages/ObrigadoPage';
import { CancelarPage } from '@/pages/CancelarPage';

// Rotas: landing de campanha (/), a página de pós-pagamento (/obrigado) e o
// cancelamento de doação recorrente (/cancelar).
// /obrigado é o destino do redirect pós-checkout — só exibe agradecimento, sem
// efeito colateral (cadastro no Brevo acontece via webhook no backend).
// /cancelar recebe o link assinado do e-mail (?t=<token>): dispara o cancelamento
// no backend e mostra o resultado (1 clique, sem confirmação — ADR-0005).
// Qualquer outra URL (link velho, digitação errada) redireciona para a landing,
// evitando a tela de erro padrão do React Router.
export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/obrigado', element: <ObrigadoPage /> },
  { path: '/cancelar', element: <CancelarPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);
