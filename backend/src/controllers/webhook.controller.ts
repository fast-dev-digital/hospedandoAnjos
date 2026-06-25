// =============================================================================
// controllers/webhook.controller.ts — recebe o webhook do Asaas.
// =============================================================================
// ADR-0005 #4: o Asaas NÃO usa assinatura HMAC; envia um token compartilhado no
// header `asaas-access-token`. Validamos por comparação simples (===) com
// env.ASAAS_WEBHOOK_TOKEN. Como não há corpo cru a validar, é rota express.json()
// normal (sem o rawBody que a Stripe exigia).
//
// FINO: valida o token, delega o roteamento ao webhook.service, responde rápido.
// Responder 200 sempre que o token confere (mesmo em evento ignorado) evita que o
// Asaas fique reenviando. Erros internos viram 500 (o Asaas então reenvia).
// =============================================================================

import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { handleAsaasEvent, type AsaasWebhookEvent } from '../services/webhook.service.js';

export async function postAsaasWebhook(req: Request, res: Response, next: NextFunction) {
  // 1. autentica a origem: o token do header precisa bater com o nosso segredo.
  const token = req.header('asaas-access-token');
  if (token !== env.ASAAS_WEBHOOK_TOKEN) {
    return res.status(401).json({ error: 'Token de webhook inválido' });
  }

  try {
    // 2. roteia o evento (cadastro/falha/cancelamento) — ver webhook.service.
    await handleAsaasEvent(req.body as AsaasWebhookEvent);
    // 3. 200 confirma o recebimento p/ o Asaas não reenviar.
    return res.status(200).json({ received: true });
  } catch (e) {
    // erro ao falar com Asaas/Brevo: 500 -> o Asaas reenvia depois (at-least-once).
    return next(e);
  }
}
