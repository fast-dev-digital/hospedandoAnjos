// =============================================================================
// services/webhook.service.ts — roteia os eventos do webhook do Asaas.
// =============================================================================
// ADR-0005 (mapeamento de eventos):
//   PAYMENT_CONFIRMED   -> cadastra/atualiza o doador no Brevo (avulsa OU
//                          recorrente; distinção pelo campo `subscription`). É o
//                          gatilho único de cadastro/agradecimento (#8).
//   PAYMENT_RECEIVED    -> mesmo tratamento do CONFIRMED, mas SÓ para PIX. O PIX
//                          NÃO emite PAYMENT_CONFIRMED (vai direto CREATED ->
//                          RECEIVED, ver docs.asaas.com/docs/fluxos-de-webhook);
//                          sem tratar RECEIVED, toda doação PIX ficava invisível
//                          ao backend (não cadastrava no Brevo, não enviava
//                          recibo). Cartão/boleto emitem CONFIRMED *e* RECEIVED —
//                          por isso ignoramos o RECEIVED deles aqui (o CONFIRMED
//                          já cuidou), evitando recibo/cadastro em duplicidade.
//   PAYMENT_OVERDUE     -> marca STATUS=falha_pagamento na mantenedora (#9).
//   SUBSCRIPTION_DELETED-> marca STATUS=inativo na mantenedora (#9).
//
// O service NÃO conhece Express. Recebe o evento já parseado (o controller valida
// o token e o JSON) e orquestra: lê o cliente no Asaas (fonte da verdade do
// doador) e chama o donor.service (regra dos 2 grupos no Brevo).
// =============================================================================

import { getCustomer } from '../integrations/asaas.js';
import { fromAsaasMobilePhone } from '../lib/phone.js';
import { sendReceiptEmail } from '../integrations/brevo.js';
import { sendWhatsAppReceipt } from '../integrations/n8n.js';
import {
  registerDonation,
  markPaymentFailed,
  markSubscriptionInactive,
  linkCancelamento,
} from './donor.service.js';

// Formato (parcial) do webhook do Asaas. Só tipamos o que usamos; o resto do
// payload é ignorado. `payment` vem nos eventos PAYMENT_*; `subscription` (objeto)
// vem no SUBSCRIPTION_*. Dentro de payment, `subscription` é a STRING do id (ou
// null na avulsa) — é o discriminador avulsa/recorrente (ADR-0005 #6).
export interface AsaasWebhookEvent {
  event: string;
  payment?: {
    customer: string; // id do cliente no Asaas
    value: number; // em reais (o Asaas trabalha decimal)
    subscription: string | null; // id da assinatura, ou null se avulsa
    billingType?: string; // PIX | CREDIT_CARD | BOLETO | ... (discrimina RECEIVED)
  };
  subscription?: {
    customer: string;
  };
}

export async function handleAsaasEvent(event: AsaasWebhookEvent): Promise<void> {
  switch (event.event) {
    // -- #8: doação confirmada (avulsa ou recorrente) -> cadastra no Brevo -------
    // Cartão/boleto passam por aqui (emitem CONFIRMED). O PIX NÃO — é tratado no
    // PAYMENT_RECEIVED abaixo. Ambos chamam a mesma rotina (registerConfirmedPayment).
    case 'PAYMENT_CONFIRMED':
      await registerConfirmedPayment(event.payment);
      return;

    // -- doação recebida: só o PIX cai aqui sem ter passado pelo CONFIRMED -------
    // Cartão/boleto também emitem RECEIVED, mas o CONFIRMED deles já cadastrou e
    // enviou o recibo; reprocessar mandaria recibo em dobro. Então só o PIX
    // (que pula o CONFIRMED) é processado no RECEIVED.
    case 'PAYMENT_RECEIVED':
      if (event.payment?.billingType === 'PIX') {
        await registerConfirmedPayment(event.payment);
      }
      return;

    // -- #9: pagamento vencido/não pago -> marca falha na mantenedora ------------
    case 'PAYMENT_OVERDUE': {
      const payment = event.payment;
      if (!payment) return;
      const customer = await getCustomer(payment.customer);
      if (!customer.email) return;
      await markPaymentFailed(customer.email);
      return;
    }

    // -- #9: assinatura cancelada (nosso link, painel, ou inadimplência) ---------
    case 'SUBSCRIPTION_DELETED': {
      const sub = event.subscription;
      if (!sub) return;
      const customer = await getCustomer(sub.customer);
      if (!customer.email) return;
      await markSubscriptionInactive(customer.email);
      return;
    }

    // qualquer outro evento (PAYMENT_CREATED, ...): ignorado.
    default:
      return;
  }
}

// Cadastra a doação confirmada no Brevo e dispara os recibos (e-mail + WhatsApp).
// Chamado pelo PAYMENT_CONFIRMED (cartão/boleto) e pelo PAYMENT_RECEIVED do PIX.
async function registerConfirmedPayment(
  payment: AsaasWebhookEvent['payment'],
): Promise<void> {
  if (!payment) return; // evento malformado: sem cobrança, nada a fazer.

  // o cliente é a fonte da verdade do doador (ADR-0005 #6): nome/telefone/CPF
  // e e-mail vêm do GET /customers/{id}, não do corpo do evento.
  const customer = await getCustomer(payment.customer);
  if (!customer.email) return; // sem e-mail não há chave de upsert no Brevo.

  // discriminador avulsa/recorrente: `subscription` preenchido => recorrente.
  const isRecorrente = payment.subscription != null;

  // o Asaas devolve o telefone sem +55 (foi assim que o gravamos); o Brevo/
  // Manychat precisam do E.164 completo -> reconstrói o +55 aqui.
  const whatsapp = fromAsaasMobilePhone(customer.mobilePhone ?? '');
  const tipo = isRecorrente ? 'recorrente' : 'avulsa';
  // link de cancelamento só existe na recorrente (tem subscription).
  const link = payment.subscription
    ? linkCancelamento(payment.subscription)
    : undefined;

  await registerDonation({
    email: customer.email,
    name: customer.name ?? '',
    whatsapp,
    type: tipo,
    // payment.value já vem em reais do Asaas; o Brevo guarda reais p/ o recibo.
    valorReais: payment.value,
    // o subscription_id (gravado no Brevo p/ o link de cancelamento) só existe
    // na recorrente; na avulsa é null e o donor.service não grava mantenedora.
    subscriptionId: payment.subscription,
    date: new Date().toISOString(),
  });

  // RECIBO: e-mail transacional (instantâneo) + WhatsApp via n8n (instantâneo).
  // Substitui a automação de marketing do Brevo (que tinha 11-26 min de latência
  // e era instável). Roda em TODA doação confirmada (avulsa, recorrente, renovação).
  await sendReceiptEmail(customer.email, {
    NOME: customer.name ?? '',
    VALOR: payment.value,
    TIPO: tipo,
    LINK_CANCELAMENTO: link,
  });
  await sendWhatsAppReceipt({
    email: customer.email,
    attributes: {
      NOME: customer.name ?? '',
      WHATSAPP_NUM: whatsapp,
      VALOR_ULTIMA: payment.value,
      TIPO_ULTIMA: tipo,
      LINK_CANCELAMENTO: link,
    },
  });
}
