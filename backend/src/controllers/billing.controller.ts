// =============================================================================
// controllers/billing.controller.ts — cancelamento de assinatura pelo link.
// =============================================================================
// EM MIGRAÇÃO (ADR-0005): a versão Stripe (redirect p/ Billing Portal) foi
// removida. A versão Asaas (valida o token que assina o subscription_id e chama
// DELETE /subscriptions/{id}) será implementada na issue de cancelamento. Até lá
// responde 501. O lib/billing-token continua válido (será reaproveitado).
// =============================================================================

import type { Request, Response } from 'express';

export async function cancelSubscription(_req: Request, res: Response) {
  return res.status(501).send('Cancelamento em migração para o Asaas');
}
