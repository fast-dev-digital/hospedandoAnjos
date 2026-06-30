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

// A ASAAS_API_KEY contém `$` (ex.: `$aact_...::$aach_...`). O Coolify tem um bug
// conhecido que trunca/muta valores com `$` mesmo com a opção "Literal"
// (coollabsio/coolify #1918, #3946, #4321). Workaround: passar a chave em base64
// na env ASAAS_API_KEY_B64 (base64 não tem `$`) e decodificar aqui. Se a B64 não
// existir, cai na ASAAS_API_KEY normal (dev local, onde o `.env` lida com `$` ok).
function asaasApiKey(): string {
  const b64 = process.env.ASAAS_API_KEY_B64;
  if (b64) {
    return Buffer.from(b64, 'base64').toString('utf8').trim();
  }
  return required('ASAAS_API_KEY');
}

export const env = {
  // Asaas — chave da API e token que o Asaas envia no header asaas-access-token
  ASAAS_API_KEY: asaasApiKey(),
  ASAAS_WEBHOOK_TOKEN: required('ASAAS_WEBHOOK_TOKEN'),
  BREVO_API_KEY: required('BREVO_API_KEY'),
  // ID do template TRANSACIONAL do recibo (Brevo → Transacional → Templates).
  // O recibo é enviado direto via POST /v3/smtp/email (instantâneo), NÃO pela
  // automação de marketing (que tinha 11-26 min de latência e era instável).
  BREVO_RECEIPT_TEMPLATE_ID: Number(process.env.BREVO_RECEIPT_TEMPLATE_ID ?? 7),
  // URL do webhook do n8n que envia o recibo por WhatsApp (Manychat). O backend
  // chama direto no PAYMENT_CONFIRMED (instantâneo), sem passar pela automação Brevo.
  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL ?? '',
  FRONTEND_ORIGIN: required('FRONTEND_ORIGIN'),
  // segredo p/ assinar o token do link de cancelamento (HMAC). Fica só no backend.
  BILLING_LINK_SECRET: required('BILLING_LINK_SECRET'),
  // base da API do Asaas (sandbox em dev, produção em prod). Default = sandbox.
  ASAAS_BASE_URL: process.env.ASAAS_BASE_URL ?? 'https://api-sandbox.asaas.com/v3',
  // base pública DESTA api; usada p/ montar o link de cancelamento gravado no Brevo.
  API_BASE_URL: process.env.API_BASE_URL ?? 'http://localhost:3000',
  PORT: Number(process.env.PORT ?? 3000),
  // Sentry — monitoramento de erros. Opcional: sem DSN, o Sentry fica desligado
  // (no-op). Setar no Coolify p/ ligar em produção. Ver instrument.ts.
  SENTRY_DSN: process.env.SENTRY_DSN ?? '',
} as const;
