// =============================================================================
// controllers/billing.controller.ts — cancelamento de assinatura pelo link.
// =============================================================================
// ADR-0005 #3/#10: o e-mail traz um link assinado (GET, porque clicar em link de
// e-mail é GET). Ao clicar, validamos o token (que assina o subscription_id) e
// chamamos DELETE /subscriptions/{id} no Asaas. Quem marca STATUS=inativo no Brevo
// é o webhook (SUBSCRIPTION_DELETED), não este endpoint — aqui só executa o DELETE.
//
// Trade-off aceito no ADR: 1 clique cancela sem tela de confirmação (simplicidade
// > risco de clique acidental). O token assinado impede cancelar assinatura alheia.
// =============================================================================

import type { Request, Response, NextFunction } from 'express';
import { verifySubscriptionToken } from '../lib/billing-token.js';
import { cancelSubscriptionById } from '../integrations/asaas.js';

export async function cancelSubscription(req: Request, res: Response, next: NextFunction) {
  // 1. o token vem na query string (?t=...). Sem token, não há o que cancelar.
  const token = typeof req.query.t === 'string' ? req.query.t : '';
  const result = verifySubscriptionToken(token);
  if (!result.ok) {
    // token ausente/forjado/adulterado: 400, sem revelar detalhe (não é erro nosso).
    // Resposta em JSON p/ a página /cancelar do frontend consumir (ok + message).
    return res
      .status(400)
      .json({ ok: false, message: 'Link de cancelamento inválido ou expirado.' });
  }

  try {
    // 2. token válido -> result.value é o subscription_id assinado. Cancela no Asaas.
    await cancelSubscriptionById(result.value);
    // 3. confirma p/ o doador. O STATUS=inativo no Brevo virá pelo webhook.
    return res.status(200).json({
      ok: true,
      message:
        'Sua doação recorrente foi cancelada. Obrigado por ter apoiado o Hospedando Anjos. 💛',
    });
  } catch (e) {
    // falha ao falar com o Asaas: vira 500 pelo error handler central.
    return next(e);
  }
}
