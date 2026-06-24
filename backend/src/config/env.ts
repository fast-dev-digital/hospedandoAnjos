// =============================================================================
// config/env.ts — leitura e validação das variáveis de ambiente
// =============================================================================
// Gateway: Asaas (ver ADR-0005). Segredos (ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN,
// BREVO_API_KEY, BILLING_LINK_SECRET) vivem nas settings do Coolify, NUNCA no
// repo. required() falha rápido no boot se uma var obrigatória faltar.
// =============================================================================

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
  return value;
}

export const env = {
  // Asaas — chave da API e token que o Asaas envia no header asaas-access-token
  ASAAS_API_KEY: required('ASAAS_API_KEY'),
  ASAAS_WEBHOOK_TOKEN: required('ASAAS_WEBHOOK_TOKEN'),
  BREVO_API_KEY: required('BREVO_API_KEY'),
  FRONTEND_ORIGIN: required('FRONTEND_ORIGIN'),
  // segredo p/ assinar o token do link de cancelamento (HMAC). Fica só no backend.
  BILLING_LINK_SECRET: required('BILLING_LINK_SECRET'),
  // base da API do Asaas (sandbox em dev, produção em prod). Default = sandbox.
  ASAAS_BASE_URL: process.env.ASAAS_BASE_URL ?? 'https://api-sandbox.asaas.com/v3',
  // base pública DESTA api; usada p/ montar o link de cancelamento gravado no Brevo.
  API_BASE_URL: process.env.API_BASE_URL ?? 'http://localhost:3000',
  PORT: Number(process.env.PORT ?? 3000),
} as const;
