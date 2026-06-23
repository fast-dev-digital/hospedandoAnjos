// =============================================================================
// middleware/rawBody.ts — preserva o corpo cru p/ validar assinatura da Stripe.
// =============================================================================
// CRÍTICO: o express.json() destrói o raw body. O webhook precisa do Buffer cru.
// Montado SÓ na rota do webhook, ANTES do express.json() (ver app.ts).
// No controller, req.body é um Buffer -> passar direto p/ constructWebhookEvent.
// =============================================================================

import express from 'express';

export const rawBodyMiddleware = express.raw({ type: 'application/json' });
