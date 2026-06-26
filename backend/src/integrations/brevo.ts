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

// Dispara um evento no Brevo (API moderna POST /v3/events, mesma api-key da API
// normal — NÃO usa a ma-key legada do trackEvent). É o GATILHO do recibo: a
// automação do Brevo usa "um evento foi rastreado" (event_name=doacao_confirmada)
// e dispara em TODA doação — avulsa, recorrente E renovação mensal (ao contrário
// de "adicionado à lista", que só dispara na 1ª vez). As `event_properties` ficam
// disponíveis no template do recibo (NOME, VALOR, etc.).
export async function sendDonationEvent(
  email: string,
  properties: Record<string, string | number>,
): Promise<void> {
  const res = await fetch(`${BASE}/events`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      event_name: 'doacao_confirmada',
      identifiers: { email_id: email },
      event_properties: properties,
    }),
  });

  // /v3/events responde 204 No Content em sucesso. Não relança erro fatal: o recibo
  // não pode derrubar o webhook (o cadastro no Brevo já foi feito); só registra.
  if (!res.ok && res.status !== 204) {
    console.error(`Brevo sendDonationEvent falhou (${res.status}): ${await res.text()}`);
  }
}
