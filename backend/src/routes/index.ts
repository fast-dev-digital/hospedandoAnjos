// =============================================================================
// routes/index.ts — liga URLs aos controllers.
// =============================================================================
// Gateway: Asaas (ADR-0005). O webhook é rota JSON normal (sem rawBody).
// `/cancelar` e `/webhooks/asaas` estão EM MIGRAÇÃO (stubs 501) até as issues
// de webhook e cancelamento.
// =============================================================================
import { Router } from 'express';
import { postCheckout } from '../controllers/checkout.controller.js';
import { cancelSubscription } from '../controllers/billing.controller.js';
import { postAsaasWebhook } from '../controllers/webhook.controller.js';

const rotas = Router();
rotas.get('/health', (_req, res) => res.json({ ok: true }));
rotas.post('/checkout', postCheckout);
// link de cancelamento (clicado no e-mail) -> cancela a assinatura no Asaas.
rotas.get('/cancelar', cancelSubscription);
// webhook do Asaas (validação por token no header; rota JSON normal).
rotas.post('/webhooks/asaas', postAsaasWebhook);

export default rotas;
