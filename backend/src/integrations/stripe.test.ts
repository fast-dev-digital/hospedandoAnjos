import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocka o SDK da Stripe: capturamos o argumento passado a sessions.create
// p/ verificar que o adapter monta os parâmetros certos por TIPO de doação.
// NÃO toca a rede nem precisa de chave (instanciação lazy permite isso).
const createSession = vi.fn();

vi.mock('stripe', () => ({
  default: class {
    checkout = { sessions: { create: createSession } };
  },
}));

import { createCheckoutSession } from './stripe.js';
import type { CheckoutRequest } from '../../../shared/checkout-contract.js';

const base: Omit<CheckoutRequest, 'type' | 'amountInCents'> = {
  name: 'Maria Silva',
  email: 'maria@exemplo.com',
  whatsapp: '+5511999998888',
};

describe('createCheckoutSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSession.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/x' });
  });

  describe('recorrente (assinatura mensal)', () => {
    it('usa mode:subscription, só card e recurring monthly', async () => {
      await createCheckoutSession({ ...base, type: 'recorrente', amountInCents: 2000 });

      const arg = createSession.mock.calls[0]![0];
      expect(arg.mode).toBe('subscription');
      expect(arg.payment_method_types).toEqual(['card']); // PIX não suporta recorrente
      expect(arg.line_items[0].price_data.recurring).toEqual({ interval: 'month' });
      expect(arg.line_items[0].price_data.unit_amount).toBe(2000);
      expect(arg.metadata.type).toBe('recorrente');
    });
  });

  describe('avulsa', () => {
    // PIX_ENABLED é lido no boot do módulo; no setup de teste fica false (default),
    // então a avulsa vai só com cartão — o estado atual até a Stripe liberar PIX.
    it('usa mode:payment, SÓ card (PIX off por default) e SEM recurring', async () => {
      await createCheckoutSession({ ...base, type: 'avulsa', amountInCents: 5000 });

      const arg = createSession.mock.calls[0]![0];
      expect(arg.mode).toBe('payment');
      expect(arg.payment_method_types).toEqual(['card']);
      expect(arg.line_items[0].price_data.recurring).toBeUndefined();
      expect(arg.metadata.type).toBe('avulsa');
    });
  });

  it('devolve a URL da sessão', async () => {
    const url = await createCheckoutSession({ ...base, type: 'avulsa', amountInCents: 5000 });
    expect(url).toBe('https://checkout.stripe.com/c/pay/x');
  });

  it('lança se a Stripe não retornar URL', async () => {
    createSession.mockResolvedValue({ url: null });
    await expect(
      createCheckoutSession({ ...base, type: 'avulsa', amountInCents: 5000 }),
    ).rejects.toThrow(/URL/);
  });
});
