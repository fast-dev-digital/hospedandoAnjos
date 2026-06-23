// =============================================================================
// middleware/cors.ts — libera SÓ a origem do frontend (domínio do cliente).
// =============================================================================
// CONTEXT.md: domínios separados (cliente × Fast) -> CORS obrigatório. Backend
// libera só https://prismabrasil.com.br (via env FRONTEND_ORIGIN).
//
// PSEUDOCÓDIGO / GUIA:
//
//   import cors from 'cors';
//   import { env } from '../config/env';
//   export const corsMiddleware = cors({ origin: env.FRONTEND_ORIGIN });
//
//   NOTA: o webhook da Stripe NÃO é chamado pelo browser -> não precisa de CORS.
// =============================================================================
import cors from 'cors';
import { env } from '../config/env.js';

export const corsMiddleware = cors({ origin: env.FRONTEND_ORIGIN });