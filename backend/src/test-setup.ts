// =============================================================================
// test-setup.ts — injeta env vars fake ANTES de qualquer import (vitest setupFiles).
// =============================================================================
// O config/env.ts usa required() e lança no boot se uma var obrigatória faltar.
// Em teste não há credenciais reais; aqui damos valores fake só para o módulo
// carregar. Os testes que tocam Stripe/Brevo mockam os adapters — nada real é
// chamado, então os valores não precisam ser válidos.
// =============================================================================

process.env.ASAAS_API_KEY ??= 'asaas_fake';
process.env.ASAAS_WEBHOOK_TOKEN ??= 'webhook_token_fake';
process.env.ASAAS_BASE_URL ??= 'https://api-sandbox.asaas.com/v3';
process.env.BREVO_API_KEY ??= 'brevo_fake';
process.env.FRONTEND_ORIGIN ??= 'http://localhost:5173';
process.env.BILLING_LINK_SECRET ??= 'test-secret';
process.env.API_BASE_URL ??= 'http://localhost:3000';
process.env.PORT ??= '3000';
