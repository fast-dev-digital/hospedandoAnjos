// =============================================================================
// controllers/webhook.controller.ts — recebe o webhook do gateway.
// =============================================================================
// EM MIGRAÇÃO (ADR-0005): a versão Stripe foi removida. A versão Asaas (validação
// por token no header `asaas-access-token`, sem rawBody, eventos PAYMENT_CONFIRMED
// / PAYMENT_OVERDUE / SUBSCRIPTION_DELETED) será implementada na issue do webhook.
// Até lá este endpoint responde 501 p/ deixar explícito que está em obras.
// =============================================================================

import type { Request, Response } from 'express';

export async function postAsaasWebhook(_req: Request, res: Response) {
  return res.status(501).json({ error: 'Webhook em migração para o Asaas' });
}
