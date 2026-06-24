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
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
  return value;
}

export const env = {
  STRIPE_SECRET_KEY: required('STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET: required('STRIPE_WEBHOOK_SECRET'),
  BREVO_API_KEY: required('BREVO_API_KEY'),
  FRONTEND_ORIGIN: required('FRONTEND_ORIGIN'),
  // segredo p/ assinar o token do link de cancelamento (HMAC). Fica só no backend.
  BILLING_LINK_SECRET: required('BILLING_LINK_SECRET'),
  // base pública da API; usada p/ montar o link de cancelamento gravado no Brevo.
  // tem default de dev -> NÃO é obrigatória (o dev/Coolify define quando precisa).
  API_BASE_URL: process.env.API_BASE_URL ?? 'http://localhost:3000',
  // PIX no checkout avulso. A Stripe BR só libera PIX após histórico (~60 dias);
  // até lá fica 'false' e o avulso vai só com cartão. Ligar quando a Stripe liberar.
  PIX_ENABLED: process.env.PIX_ENABLED === 'true',
  PORT: Number(process.env.PORT ?? 3000),
} as const;
