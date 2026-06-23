// =============================================================================
// services/donor.service.ts — upsert do doador no Brevo (2 grupos de campos).
// =============================================================================
// CONTEXT.md — regra de upsert (decisão B):
//   RECORRENTE -> atualiza grupo MANTENEDORA (TIPO=recorrente, STATUS=ativo,
//                 VALOR, STRIPE_CUSTOMER_ID, DATA_PRIMEIRA_DOACAO se 1ª) E grupo
//                 ÚLTIMA DOAÇÃO.
//   AVULSA     -> atualiza SÓ grupo última doação. Se não existe -> cria TIPO=avulsa.
//                 Se já existe como recorrente -> NÃO REBAIXA (não toca mantenedora).
// =============================================================================

import { upsertContact, getContact } from '../integrations/brevo.js';
import { signCustomerToken } from '../lib/billing-token.js';
import { env } from '../config/env.js';
import type { DonationType } from '../../../shared/checkout-contract.js';

// monta o link de cancelamento (forma B): aponta p/ a API com o token assinado.
// O Brevo só insere este campo no e-mail; quem o gera com segurança é o backend.
function linkCancelamento(customerId: string): string {
  return `${env.API_BASE_URL}/billing-portal?t=${signCustomerToken(customerId)}`;
}

export interface Donation {
  email: string;
  name: string;
  whatsapp: string; // E.164
  type: DonationType;
  valorCents: number;
  customerId: string | null;
  date: string; // ISO
}

export async function registerDonation(d: Donation): Promise<void> {
  const base = { EMAIL: d.email, NOME: d.name, WHATSAPP: d.whatsapp };
  const ultima = {
    VALOR_ULTIMA: d.valorCents,
    DATA_ULTIMA: d.date, // gatilho do n8n que faz mandar agradicimento ao manychat
    TIPO_ULTIMA: d.type,
  };

  if (d.type === 'recorrente') {
    const existing = await getContact(d.email);
    const mantenedora = {
      TIPO: 'recorrente',
      STATUS: 'ativo',
      VALOR: d.valorCents,
      // customerId + link de cancelamento só existem se a Stripe criou o Customer
      // (sempre verdade na recorrente/subscription).
      ...(d.customerId
        ? {
            STRIPE_CUSTOMER_ID: d.customerId,
            LINK_CANCELAMENTO: linkCancelamento(d.customerId),
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

// renovação mensal (invoice.payment_succeeded de subscription_cycle): atualiza
// SÓ o grupo última doação. Muda DATA_ULTIMA -> dispara o e-mail mensal de recibo
// (via automação do Brevo/n8n). Não toca a mantenedora (não rebaixa, não regrava).
export async function registerRecurringRenewal(email: string, valorCents: number): Promise<void> {
  await upsertContact(email, {
    VALOR_ULTIMA: valorCents,
    DATA_ULTIMA: new Date().toISOString(),
    TIPO_ULTIMA: 'recorrente',
  });
}

// transições de STATUS (grupo mantenedora) — usadas na slice de status (#4).
export async function markPaymentFailed(email: string): Promise<void> {
  await upsertContact(email, { STATUS: 'falha_pagamento' });
}

export async function markSubscriptionInactive(email: string): Promise<void> {
  await upsertContact(email, { STATUS: 'inativo' });
}
