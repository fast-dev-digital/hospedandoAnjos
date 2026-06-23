import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registerDonation,
  registerRecurringRenewal,
  markPaymentFailed,
  markSubscriptionInactive,
} from './donor.service.js';
import { upsertContact, getContact } from '../integrations/brevo.js';

// Mocka o adapter do Brevo: o teste verifica a REGRA dos 2 grupos, não o HTTP.
vi.mock('../integrations/brevo.js', () => ({
  upsertContact: vi.fn(),
  getContact: vi.fn(),
}));

const mockUpsert = vi.mocked(upsertContact);
const mockGet = vi.mocked(getContact);

const avulsa = {
  email: 'maria@exemplo.com',
  name: 'Maria Silva',
  whatsapp: '+5511999998888',
  type: 'avulsa' as const,
  valorCents: 5000,
  customerId: 'cus_123',
  date: '2026-06-23T12:00:00.000Z',
};

describe('registerDonation', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('avulsa', () => {
    it('faz upsert SÓ com base + grupo última doação (não envia campos de mantenedora)', async () => {
      await registerDonation(avulsa);

      expect(mockUpsert).toHaveBeenCalledWith('maria@exemplo.com', {
        EMAIL: 'maria@exemplo.com',
        NOME: 'Maria Silva',
        WHATSAPP: '+5511999998888',
        VALOR_ULTIMA: 5000,
        DATA_ULTIMA: '2026-06-23T12:00:00.000Z',
        TIPO_ULTIMA: 'avulsa',
      });
    });

    it('NÃO rebaixa: não envia TIPO/STATUS/VALOR mesmo que o contato já exista', async () => {
      await registerDonation(avulsa);

      const attrs = mockUpsert.mock.calls[0]![1];
      expect(attrs).not.toHaveProperty('TIPO');
      expect(attrs).not.toHaveProperty('STATUS');
      expect(attrs).not.toHaveProperty('VALOR');
      expect(mockGet).not.toHaveBeenCalled(); // avulsa nem lê o contato
    });
  });

  describe('recorrente', () => {
    it('atualiza grupo mantenedora + última doação; preserva DATA_PRIMEIRA se já existe', async () => {
      mockGet.mockResolvedValue({ DATA_PRIMEIRA_DOACAO: '2025-01-01T00:00:00.000Z' });

      await registerDonation({ ...avulsa, type: 'recorrente' });

      expect(mockUpsert).toHaveBeenCalledWith(
        'maria@exemplo.com',
        expect.objectContaining({
          EMAIL: 'maria@exemplo.com',
          NOME: 'Maria Silva',
          WHATSAPP: '+5511999998888',
          TIPO: 'recorrente',
          STATUS: 'ativo',
          VALOR: 5000,
          STRIPE_CUSTOMER_ID: 'cus_123',
          DATA_PRIMEIRA_DOACAO: '2025-01-01T00:00:00.000Z',
          VALOR_ULTIMA: 5000,
          DATA_ULTIMA: '2026-06-23T12:00:00.000Z',
          TIPO_ULTIMA: 'recorrente',
        }),
      );
    });

    it('usa a data atual como DATA_PRIMEIRA quando o contato é novo', async () => {
      mockGet.mockResolvedValue(null);

      await registerDonation({ ...avulsa, type: 'recorrente' });

      const attrs = mockUpsert.mock.calls[0]![1];
      expect(attrs.DATA_PRIMEIRA_DOACAO).toBe('2026-06-23T12:00:00.000Z');
    });

    it('grava LINK_CANCELAMENTO apontando p/ a API com token (forma B)', async () => {
      mockGet.mockResolvedValue(null);

      await registerDonation({ ...avulsa, type: 'recorrente' });

      const attrs = mockUpsert.mock.calls[0]![1];
      // link aponta p/ a API (/billing-portal) e carrega o token assinado.
      expect(String(attrs.LINK_CANCELAMENTO)).toMatch(/\/billing-portal\?t=.+/);
    });

    it('avulsa NÃO gera link de cancelamento (não é mantenedor)', async () => {
      await registerDonation(avulsa);

      const attrs = mockUpsert.mock.calls[0]![1];
      expect(attrs).not.toHaveProperty('LINK_CANCELAMENTO');
    });
  });
});

describe('registerRecurringRenewal (recibo mensal)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('atualiza SÓ o grupo última doação (TIPO_ULTIMA=recorrente); não toca mantenedora', async () => {
    await registerRecurringRenewal('maria@exemplo.com', 2000);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const [email, attrs] = mockUpsert.mock.calls[0]!;
    expect(email).toBe('maria@exemplo.com');
    expect(attrs).toMatchObject({ VALOR_ULTIMA: 2000, TIPO_ULTIMA: 'recorrente' });
    expect(attrs).toHaveProperty('DATA_ULTIMA'); // gatilho do e-mail mensal
    // não rebaixa nem regrava mantenedora
    expect(attrs).not.toHaveProperty('TIPO');
    expect(attrs).not.toHaveProperty('STATUS');
    expect(attrs).not.toHaveProperty('VALOR');
  });
});

describe('marcadores de STATUS', () => {
  beforeEach(() => vi.clearAllMocks());

  it('markPaymentFailed envia só STATUS=falha_pagamento', async () => {
    await markPaymentFailed('maria@exemplo.com');
    expect(mockUpsert).toHaveBeenCalledWith('maria@exemplo.com', { STATUS: 'falha_pagamento' });
  });

  it('markSubscriptionInactive envia só STATUS=inativo', async () => {
    await markSubscriptionInactive('maria@exemplo.com');
    expect(mockUpsert).toHaveBeenCalledWith('maria@exemplo.com', { STATUS: 'inativo' });
  });
});
