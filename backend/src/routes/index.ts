// =============================================================================
// routes/index.ts — liga URLs aos controllers.
// =============================================================================
// PSEUDOCÓDIGO / GUIA:
//
//   import { Router } from 'express';
//   import { postCheckout } from '../controllers/checkout.controller';
//   import { postStripeWebhook } from '../controllers/webhook.controller';
//   import { postBillingPortal } from '../controllers/billing.controller';
//
//   const router = Router();
//   router.get('/health', (_req, res) => res.json({ ok: true }));
//   router.post('/checkout', postCheckout);
//   router.post('/billing-portal', postBillingPortal);
//   // NOTA: /webhooks/stripe é montado no app.ts ANTES do express.json(),
//   // com o middleware rawBody — não aqui, p/ não perder o raw body.
//   export default router;
// =============================================================================
import { Router } from 'express';
import { postCheckout } from '../controllers/checkout.controller.js';
import { getBillingPortal } from '../controllers/billing.controller.js';

const rotas = Router();
rotas.get('/health', (_req, res) => res.json({ok:true}));
rotas.post('/checkout', postCheckout);
// link de cancelamento (clicado no e-mail) -> redireciona p/ o portal da Stripe.
rotas.get('/billing-portal', getBillingPortal);
// NOTA: /webhooks/stripe é montado no app.ts ANTES do express.json() (raw body).

export default rotas;