// =============================================================================
// services/webhook.service.ts — roteia os 3 eventos da Stripe.
// =============================================================================
// CONTEXT.md/ADR: tratar SÓ 3 eventos; qualquer outro -> ignora (200).
// Cadastro no Brevo SÓ no webhook, nunca na success_url. Idempotência: upsert
// por e-mail é naturalmente idempotente; de-dupe do agradecimento é do n8n.
//
//   checkout.session.completed     -> registerDonation (upsert Brevo)
//   invoice.payment_failed         -> markPaymentFailed (STATUS=falha_pagamento)
//   customer.subscription.deleted  -> markSubscriptionInactive (STATUS=inativo)
// =============================================================================

import type Stripe from 'stripe';
import * as donor from './donor.service.js';
import type { DonationType } from '../../../shared/checkout-contract.js';

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object;
      const email = s.customer_details?.email ?? s.customer_email;
      if (!email) {
        throw new Error('checkout.session.completed sem e-mail do doador');
      }
      const md = s.metadata ?? {};
      await donor.registerDonation({
        email,
        name: md.name ?? '',
        whatsapp: md.whatsapp ?? '',
        type: (md.type as DonationType) ?? 'avulsa',
        valorCents: s.amount_total ?? 0,
        customerId: typeof s.customer === 'string' ? s.customer : (s.customer?.id ?? null),
        date: new Date().toISOString(),
      });
      return;
    }

    case 'invoice.payment_failed': {
      const email = emailFromEvent(event.data.object);
      if (email) await donor.markPaymentFailed(email);
      return;
    }

    case 'customer.subscription.deleted': {
      const email = emailFromEvent(event.data.object);
      if (email) await donor.markSubscriptionInactive(email);
      return;
    }

    default:
      // qualquer outro evento é ignorado -> o controller responde 200.
      return;
  }
}

// e-mail do doador em eventos de assinatura/fatura. O objeto pode trazer o
// e-mail diretamente (invoice) ou só o customer expandido.
function emailFromEvent(obj: unknown): string | null {
  const o = obj as { customer_email?: string | null; customer?: unknown };
  if (o.customer_email) return o.customer_email;
  const c = o.customer as { email?: string | null } | undefined;
  return c?.email ?? null;
}
