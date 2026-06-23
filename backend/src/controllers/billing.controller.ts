// =============================================================================
// controllers/billing.controller.ts — gera sessão do Billing Portal (cancelamento).
// =============================================================================
// CONTEXT.md: cancelamento SÓ via Billing Portal da Stripe. O link de cancelamento
// vai no e-mail (gravado no Brevo pelo donor.service) e chama esta API direto.
//
// Fluxo: doador clica no link -> GET /billing-portal?t=<token assinado> ->
// verifica o token (prova quem é o doador, sem login) -> cria a sessão do portal
// -> redireciona (302) direto p/ a tela da Stripe.
// =============================================================================
import { verifyCustomerToken } from '../lib/billing-token.js';
import { createBillingPortalSession } from '../integrations/stripe.js';
import type { Request, Response, NextFunction } from 'express';

export async function getBillingPortal(req: Request, res: Response, next: NextFunction) {
  const token = typeof req.query.t === 'string' ? req.query.t : '';

  // token assinado identifica o customerId (cus_xxx). Inválido/expirado -> 400.
  const result = verifyCustomerToken(token);
  if (!result.ok) {
    return res.status(400).send('Link de cancelamento inválido ou expirado.');
  }

  try {
    const url = await createBillingPortalSession(result.value);
    return res.redirect(302, url);
  } catch (e) {
    next(e);
  }
}
