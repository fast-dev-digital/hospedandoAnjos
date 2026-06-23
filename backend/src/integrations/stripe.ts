// =============================================================================
// integrations/stripe.ts — adapter do SDK da Stripe. Isola o SDK (ADR-0002).
// =============================================================================
// CONTEXT.md/ADR-0001: Checkout HOSPEDADO. Valor inline via price_data (sem
// Products/Prices pré-criados). ADR-0003: avulsa=card+pix, recorrente=card.
//
// Instanciação LAZY: o SDK só é criado na 1ª chamada (getStripe), não no import.
// Assim o módulo pode ser importado (e o checkout.service testado via mock) sem
// a STRIPE_SECRET_KEY presente. Quando a chave chegar, a chamada real funciona.
// =============================================================================

import Stripe from 'stripe';
import { env } from '../config/env.js';
import type { CheckoutRequest } from '../../../shared/checkout-contract.js';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}

// cria a Checkout Session hospedada e devolve a URL para redirect.
export async function createCheckoutSession(input: CheckoutRequest): Promise<string> {
  const isRecorrente = input.type === 'recorrente';

  const session = await getStripe().checkout.sessions.create({
    mode: isRecorrente ? 'subscription' : 'payment',
    payment_method_types: isRecorrente ? ['card'] : ['card', 'pix'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'brl',
          unit_amount: input.amountInCents,
          product_data: { name: 'Doação Hospedando Anjos' },
          // recorrente vira assinatura mensal; avulsa não leva recurring
          ...(isRecorrente ? { recurring: { interval: 'month' as const } } : {}),
        },
      },
    ],
    // cadastro invisível: Stripe cria/anexa o Customer pelo e-mail
    customer_email: input.email,
    // SEM project_target; lido no webhook checkout.session.completed
    metadata: {
      type: input.type,
      name: input.name,
      whatsapp: input.whatsapp,
    },
    success_url: `${env.FRONTEND_ORIGIN}/obrigado`,
    cancel_url: env.FRONTEND_ORIGIN,
  });

  if (!session.url) {
    throw new Error('Stripe não retornou a URL da sessão de checkout');
  }
  return session.url;
}

// valida assinatura do webhook (raw body + header stripe-signature). Usado na #2.
export function constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
  return getStripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
}

// Billing Portal (cancelamento). Usado na #5.
export async function createBillingPortalSession(customerId: string): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: env.FRONTEND_ORIGIN,
  });
  return session.url;
}
