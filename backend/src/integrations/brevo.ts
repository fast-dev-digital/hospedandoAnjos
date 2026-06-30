// =============================================================================
// integrations/brevo.ts — adapter da API do Brevo. Isola o SDK (ADR-0002).
// =============================================================================
// CONTEXT.md: Brevo = CRM, upsert por EMAIL (uma linha por pessoa). Atributos:
//   mantenedora: TIPO, VALOR, STATUS, ASAAS_SUBSCRIPTION_ID, DATA_PRIMEIRA_DOACAO
//   última doação: VALOR_ULTIMA, DATA_ULTIMA (gatilho do n8n), TIPO_ULTIMA
//   sempre: EMAIL, NOME, WHATSAPP_NUM (WHATSAPP é reservado no Brevo — usar custom)
//
// Aqui é só transporte HTTP (fetch nativo do Node 22). A lógica de QUAIS campos
// atualizar (regra dos 2 grupos) vive no donor.service, não aqui.
// =============================================================================

import { env } from '../config/env.js';

const BASE = 'https://api.brevo.com/v3';

// Atributos do contato no Brevo. Valores são string|number (a API aceita ambos).
export type BrevoAttributes = Record<string, string | number>;

function headers() {
  return {
    'api-key': env.BREVO_API_KEY,
    'content-type': 'application/json',
    accept: 'application/json',
  };
}

// upsert idempotente por e-mail (updateEnabled:true). Reprocessar o mesmo doador
// não duplica o contato — é a idempotência natural do webhook (ver CONTEXT.md).
export async function upsertContact(email: string, attributes: BrevoAttributes): Promise<void> {
  const res = await fetch(`${BASE}/contacts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, attributes, updateEnabled: true }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo upsertContact falhou (${res.status}): ${body}`);
  }
}

// lê o contato p/ saber se já é recorrente (avulsa não rebaixa). 404 -> null.
export async function getContact(email: string): Promise<BrevoAttributes | null> {
  const res = await fetch(`${BASE}/contacts/${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: headers(),
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo getContact falhou (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { attributes?: BrevoAttributes };
  return data.attributes ?? {};
}

// Envia o RECIBO por e-mail TRANSACIONAL (POST /v3/smtp/email com templateId).
// Caminho direto e INSTANTÂNEO — substitui a automação de marketing do Brevo, que
// tinha latência de 11-26 min e disparava de forma instável (gatilho de evento não
// confiável; comprovado em prod). O template (env.BREVO_RECEIPT_TEMPLATE_ID) usa
// {{ params.X }}: NOME, VALOR, TIPO, LINK_CANCELAMENTO. Roda em TODA doação
// confirmada (avulsa, recorrente e renovação). Não relança erro fatal: o recibo
// não pode derrubar o webhook (o cadastro no Brevo já foi feito); só registra.
export async function sendReceiptEmail(
  email: string,
  params: {
    NOME: string;
    VALOR: number;
    TIPO: string;
    LINK_CANCELAMENTO?: string;
  },
): Promise<void> {
  const res = await fetch(`${BASE}/smtp/email`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      to: [{ email }],
      templateId: env.BREVO_RECEIPT_TEMPLATE_ID,
      params,
    }),
  });

  if (!res.ok) {
    console.error(`Brevo sendReceiptEmail falhou (${res.status}): ${await res.text()}`);
  }
}
