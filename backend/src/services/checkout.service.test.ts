import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startCheckout } from './checkout.service.js';
import { ValidationError } from '../lib/errors.js';
import {
  findOrCreateCustomer,
  createPayment,
  createSubscription,
} from '../integrations/asaas.js';

// Mocka o adapter do Asaas: o teste verifica a ORQUESTRAÇÃO do service (cliente
// -> cobrança/assinatura), sem tocar a rede.
vi.mock('../integrations/asaas.js', () => ({
  findOrCreateCustomer: vi.fn(),
  createPayment: vi.fn(),
  createSubscription: vi.fn(),
}));

const mockCustomer = vi.mocked(findOrCreateCustomer);
const mockPayment = vi.mocked(createPayment);
const mockSubscription = vi.mocked(createSubscription);

// front envia valor em centavos (parseToCents) e CPF.
const bodyValido = {
  type: 'avulsa',
  amountInCents: 5000, // R$50,00
  name: 'Maria Silva',
  email: 'maria@exemplo.com',
  whatsapp: '+5511999998888',
  cpf: '529.982.247-25',
};

describe('startCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCustomer.mockResolvedValue('cus_123');
  });

  describe('avulsa', () => {
    it('cria cliente e cobrança, retorna a invoiceUrl como checkoutUrl', async () => {
      mockPayment.mockResolvedValue('https://asaas.com/i/abc');

      const result = await startCheckout(bodyValido);

      expect(result).toEqual({ checkoutUrl: 'https://asaas.com/i/abc' });
      expect(mockSubscription).not.toHaveBeenCalled();
    });

    it('passa o cliente SANITIZADO ao adapter (whatsapp E.164, cpf só-dígitos)', async () => {
      mockPayment.mockResolvedValue('https://asaas.com/i/x');

      await startCheckout({
        ...bodyValido,
        name: '  Maria Silva  ',
        whatsapp: ' +55 (11) 99999-8888 ',
      });

      expect(mockCustomer).toHaveBeenCalledWith({
        name: 'Maria Silva',
        email: 'maria@exemplo.com',
        mobilePhone: '+5511999998888',
        cpf: '52998224725',
      });
      expect(mockPayment).toHaveBeenCalledWith({ customerId: 'cus_123', amountInCents: 5000 });
    });
  });

  describe('recorrente', () => {
    it('cria cliente e assinatura (não cobrança avulsa)', async () => {
      mockSubscription.mockResolvedValue('https://asaas.com/i/sub');

      const result = await startCheckout({ ...bodyValido, type: 'recorrente', amountInCents: 2000 });

      expect(result).toEqual({ checkoutUrl: 'https://asaas.com/i/sub' });
      expect(mockSubscription).toHaveBeenCalledWith({ customerId: 'cus_123', amountInCents: 2000 });
      expect(mockPayment).not.toHaveBeenCalled();
    });
  });

  describe('payload inválido', () => {
    it('lança ValidationError e NÃO toca o Asaas (valor abaixo do mínimo)', async () => {
      await expect(startCheckout({ ...bodyValido, amountInCents: 50 })).rejects.toThrow(
        ValidationError,
      );
      expect(mockCustomer).not.toHaveBeenCalled();
    });

    it('lança ValidationError com CPF inválido', async () => {
      await expect(startCheckout({ ...bodyValido, cpf: '111.111.111-11' })).rejects.toThrow(
        ValidationError,
      );
      expect(mockCustomer).not.toHaveBeenCalled();
    });

    it('lança ValidationError quando o body não é objeto', async () => {
      await expect(startCheckout(null)).rejects.toThrow(ValidationError);
      expect(mockCustomer).not.toHaveBeenCalled();
    });
  });
});
