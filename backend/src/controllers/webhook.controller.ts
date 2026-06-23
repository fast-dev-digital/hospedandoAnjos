// =============================================================================
// controllers/webhook.controller.ts — recebe webhook da Stripe.
// =============================================================================
// CRÍTICO: usa o RAW body (Buffer, via rawBodyMiddleware) p/ validar a assinatura.
// Assinatura inválida -> 400. Erro NOSSO ao processar -> loga mas responde 200
// (Stripe é at-least-once; não queremos retry infinito por bug interno — o
// upsert é idempotente, então reprocessar depois é seguro).
// =============================================================================

import type { Request, Response } from 'express';
import { constructWebhookEvent } from '../integrations/stripe.js';
import { handleStripeEvent } from '../services/webhook.service.js';

export async function postStripeWebhook(req: Request, res: Response) {
  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') {
    return res.status(400).send('assinatura ausente');
  }

  let event;
  try {
    event = constructWebhookEvent(req.body as Buffer, signature);
  } catch {
    return res.status(400).send('assinatura inválida');
  }

  try {
    await handleStripeEvent(event);
  } catch (e) {
    // não devolve 500: o evento foi recebido e validado; o erro é nosso e o
    // upsert é idempotente. Loga p/ investigar sem provocar retry da Stripe.
    console.error('Erro ao processar webhook da Stripe:', e);
  }

  return res.status(200).json({ received: true });
}
