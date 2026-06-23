// =============================================================================
// config/env.ts — leitura e validação das variáveis de ambiente
// =============================================================================
// STATUS: PENDENTE DE CREDENCIAIS. Os acessos (Stripe/Brevo) ainda não foram
// liberados, então este arquivo segue como esqueleto. Quando as chaves chegarem,
// implementar o required() (falha rápido no boot se faltar var obrigatória).
// =============================================================================
// CONTEXT.md: segredos (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, BREVO_API_KEY)
// vivem nas settings do Coolify, NUNCA no repo. Frontend nunca vê sk_/BREVO.
//
// CONTEXT.md: segredos (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, BREVO_API_KEY)
// vivem nas settings do Coolify, NUNCA no repo. Frontend nunca vê sk_/BREVO.
// =============================================================================

// Versão PLACEHOLDER: lê process.env com fallback vazio para o backend subir
// sem as credenciais durante o desenvolvimento.
//
// TODO(acessos): quando Stripe/Brevo forem liberados, trocar `?? ''` por um
// required() que lança no boot se a var obrigatória faltar (falha rápido).
export const env = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  BREVO_API_KEY: process.env.BREVO_API_KEY ?? '',
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  PORT: Number(process.env.PORT ?? 3000),
} as const;
