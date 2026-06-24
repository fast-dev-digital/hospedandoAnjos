import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startCheckout } from './checkout.service.js';
import { ValidationError } from '../lib/errors.js';
import { createCheckoutSession } from '../integrations/stripe.js';

// Mocka o adapter da Stripe: o teste NÃO toca o SDK real nem precisa de chave.
// Só verificamos a orquestração do service.
vi.mock('../integrations/stripe.js', () => ({
  createCheckoutSession: vi.fn(),
}));

const mockedCreate = vi.mocked(createCheckoutSession);

// o front já envia em centavos (parseToCents); o backend só revalida o mínimo.
const bodyValido = {
  type: 'avulsa',
  amountInCents: 5000, // R$50,00
  name: 'Maria Silva',
  email: 'maria@exemplo.com',
  whatsapp: '+5511999998888',
};

describe('startCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('payload válido', () => {
    it('retorna a checkoutUrl que o adapter devolveu', async () => {
      mockedCreate.mockResolvedValue('https://checkout.stripe.com/c/pay/abc123');

      const result = await startCheckout(bodyValido);

      expect(result).toEqual({ checkoutUrl: 'https://checkout.stripe.com/c/pay/abc123' });
    });

    it('passa o payload SANITIZADO ao adapter (whatsapp E.164, strings trimadas)', async () => {
      mockedCreate.mockResolvedValue('https://checkout.stripe.com/c/pay/x');

      await startCheckout({
        ...bodyValido,
        name: '  Maria Silva  ',
        whatsapp: ' +55 (11) 99999-8888 ',
      });

      expect(mockedCreate).toHaveBeenCalledWith({
        type: 'avulsa',
        amountInCents: 5000,
        name: 'Maria Silva',
        email: 'maria@exemplo.com',
        whatsapp: '+5511999998888',
      });
    });
  });

  describe('payload inválido', () => {
    it('lança ValidationError e NÃO chama a Stripe', async () => {
      await expect(startCheckout({ ...bodyValido, amountInCents: 50 })).rejects.toThrow(
        ValidationError,
      );
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('lança ValidationError quando o body não é objeto', async () => {
      await expect(startCheckout(null)).rejects.toThrow(ValidationError);
      expect(mockedCreate).not.toHaveBeenCalled();
    });
  });
});
