// =============================================================================
// services/donor.service.ts — upsert do doador no Brevo (2 grupos de campos).
// =============================================================================
// CONTEXT.md / ADR-0005 — regra de upsert (decisão B):
//   RECORRENTE -> atualiza grupo MANTENEDORA (TIPO=recorrente, STATUS=ativo,
//                 VALOR, ASAAS_SUBSCRIPTION_ID, DATA_PRIMEIRA_DOACAO se 1ª) E grupo
//                 ÚLTIMA DOAÇÃO.
//   AVULSA     -> atualiza SÓ grupo última doação. Se não existe -> cria TIPO=avulsa.
//                 Se já existe como recorrente -> NÃO REBAIXA (não toca mantenedora).
//
// Migração (ADR-0005 #9): guardamos o subscription_id do Asaas (não o customer) —
// é o que o link de cancelamento precisa p/ chamar DELETE /subscriptions/{id}.
// =============================================================================

import { upsertContact, getContact } from '../integrations/brevo.js';
import { signSubscriptionToken } from '../lib/billing-token.js';
import { env } from '../config/env.js';
import type { DonationType } from '../../../shared/checkout-contract.js';

// monta o link de cancelamento (forma B): aponta p/ a API com o token assinado da
// assinatura. O Brevo só insere este campo no e-mail; quem o gera com segurança é
// o backend. A rota /cancelar valida o token e chama DELETE /subscriptions/{id}.
function linkCancelamento(subscriptionId: string): string {
  return `${env.API_BASE_URL}/cancelar?t=${signSubscriptionToken(subscriptionId)}`;
}

export interface Donation {
  email: string;
  name: string;
  whatsapp: string; // E.164
  type: DonationType;
  // valor em REAIS (ex.: 20.00). O Brevo é CRM: VALOR vira variável no recibo de
  // e-mail/WhatsApp ("doação de R$ {{VALOR}}"), então gravamos pronto p/ exibir —
  // não em centavos (decisão tomada nesta sessão; ver CONTEXT.md).
  valorReais: number;
  // id da assinatura do Asaas — só existe na recorrente (avulsa não tem subscription).
  subscriptionId: string | null;
  date: string; // ISO
}

export async function registerDonation(d: Donation): Promise<void> {
  const base = { EMAIL: d.email, NOME: d.name, WHATSAPP: d.whatsapp };
  const ultima = {
    VALOR_ULTIMA: d.valorReais,
    DATA_ULTIMA: d.date, // gatilho do n8n que faz mandar agradecimento ao manychat
    TIPO_ULTIMA: d.type,
  };

  if (d.type === 'recorrente') {
    const existing = await getContact(d.email);
    const mantenedora = {
      TIPO: 'recorrente',
      STATUS: 'ativo',
      VALOR: d.valorReais,
      // subscriptionId + link de cancelamento só existem se há assinatura
      // (sempre verdade na recorrente; a avulsa cai no ramo de baixo).
      ...(d.subscriptionId
        ? {
            ASAAS_SUBSCRIPTION_ID: d.subscriptionId,
            LINK_CANCELAMENTO: linkCancelamento(d.subscriptionId),
          }
        : {}),
      DATA_PRIMEIRA_DOACAO: (existing?.DATA_PRIMEIRA_DOACAO as string) ?? d.date,
    };
    await upsertContact(d.email, { ...base, ...mantenedora, ...ultima });
    return;
  }

  // avulsa: NÃO envia campos da mantenedora (TIPO/STATUS/VALOR) -> não rebaixa
  // quem já é recorrente. Contato novo é criado com TIPO=avulsa (default da conta).
  await upsertContact(d.email, { ...base, ...ultima });
}

// renovação mensal (PAYMENT_CONFIRMED de uma cobrança com subscription): atualiza
// SÓ o grupo última doação. Muda DATA_ULTIMA -> dispara o e-mail mensal de recibo
// (via automação do Brevo/n8n). Não toca a mantenedora (não rebaixa, não regrava).
export async function registerRecurringRenewal(email: string, valorReais: number): Promise<void> {
  await upsertContact(email, {
    VALOR_ULTIMA: valorReais,
    DATA_ULTIMA: new Date().toISOString(),
    TIPO_ULTIMA: 'recorrente',
  });
}

// transições de STATUS (grupo mantenedora) — usadas na slice de status (#9).
export async function markPaymentFailed(email: string): Promise<void> {
  await upsertContact(email, { STATUS: 'falha_pagamento' });
}

export async function markSubscriptionInactive(email: string): Promise<void> {
  await upsertContact(email, { STATUS: 'inativo' });
}
