import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';
import { handleStripeEvent } from './webhook.service.js';
import * as donor from './donor.service.js';

// Mocka o donor.service: aqui testamos o ROTEAMENTO/extração de campos, não o Brevo.
vi.mock('./donor.service.js', () => ({
  registerDonation: vi.fn(),
  markPaymentFailed: vi.fn(),
  markSubscriptionInactive: vi.fn(),
}));

const mockRegister = vi.mocked(donor.registerDonation);
const mockFailed = vi.mocked(donor.markPaymentFailed);
const mockInactive = vi.mocked(donor.markSubscriptionInactive);

// helper: monta um Event mínimo com o type e o objeto desejados.
function evt(type: string, object: unknown): Stripe.Event {
  return { type, data: { object } } as unknown as Stripe.Event;
}

describe('handleStripeEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('checkout.session.completed', () => {
    it('extrai e-mail/metadata/amount/customer e chama registerDonation', async () => {
      await handleStripeEvent(
        evt('checkout.session.completed', {
          customer_details: { email: 'maria@exemplo.com' },
          metadata: { name: 'Maria Silva', whatsapp: '+5511999998888', type: 'avulsa' },
          amount_total: 5000,
          customer: 'cus_123',
        }),
      );

      expect(mockRegister).toHaveBeenCalledTimes(1);
      const arg = mockRegister.mock.calls[0]![0];
      expect(arg).toMatchObject({
        email: 'maria@exemplo.com',
        name: 'Maria Silva',
        whatsapp: '+5511999998888',
        type: 'avulsa',
        valorCents: 5000,
        customerId: 'cus_123',
      });
      expect(typeof arg.date).toBe('string');
    });

    it('lança se a sessão não tem e-mail (não dá p/ cadastrar)', async () => {
      await expect(
        handleStripeEvent(
          evt('checkout.session.completed', { metadata: {}, amount_total: 5000 }),
        ),
      ).rejects.toThrow(/e-mail/);
    });
  });

  describe('eventos de assinatura', () => {
    it('invoice.payment_failed -> markPaymentFailed', async () => {
      await handleStripeEvent(evt('invoice.payment_failed', { customer_email: 'x@y.com' }));
      expect(mockFailed).toHaveBeenCalledWith('x@y.com');
    });

    it('customer.subscription.deleted -> markSubscriptionInactive (customer expandido)', async () => {
      await handleStripeEvent(
        evt('customer.subscription.deleted', { customer: { email: 'x@y.com' } }),
      );
      expect(mockInactive).toHaveBeenCalledWith('x@y.com');
    });
  });

  describe('evento não tratado', () => {
    it('ignora silenciosamente sem chamar nenhum service', async () => {
      await handleStripeEvent(evt('payment_intent.succeeded', {}));
      expect(mockRegister).not.toHaveBeenCalled();
      expect(mockFailed).not.toHaveBeenCalled();
      expect(mockInactive).not.toHaveBeenCalled();
    });
  });
});
