import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAsaasEvent } from './webhook.service.js';
import { getCustomer } from '../integrations/asaas.js';
import {
  registerDonation,
  markPaymentFailed,
  markSubscriptionInactive,
} from './donor.service.js';

// Mockamos o adapter do Asaas e o donor.service: o teste verifica o ROTEAMENTO do
// evento (qual ação dispara, com quais dados), não o HTTP nem a regra do Brevo.
vi.mock('../integrations/asaas.js', () => ({ getCustomer: vi.fn() }));
vi.mock('./donor.service.js', () => ({
  registerDonation: vi.fn(),
  markPaymentFailed: vi.fn(),
  markSubscriptionInactive: vi.fn(),
}));

const mockGetCustomer = vi.mocked(getCustomer);
const mockRegister = vi.mocked(registerDonation);
const mockFailed = vi.mocked(markPaymentFailed);
const mockInactive = vi.mocked(markSubscriptionInactive);

// cliente padrão devolvido pelo getCustomer (fonte da verdade do doador).
const customer = {
  id: 'cus_1',
  name: 'Maria Silva',
  email: 'maria@exemplo.com',
  mobilePhone: '+5511999998888',
  cpfCnpj: '12345678909',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCustomer.mockResolvedValue(customer);
});

describe('PAYMENT_CONFIRMED (#8)', () => {
  it('avulsa (subscription null): registra doação tipo avulsa, sem subscriptionId', async () => {
    await handleAsaasEvent({
      event: 'PAYMENT_CONFIRMED',
      payment: { customer: 'cus_1', value: 50, subscription: null },
    });

    expect(mockGetCustomer).toHaveBeenCalledWith('cus_1');
    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'maria@exemplo.com',
        name: 'Maria Silva',
        whatsapp: '+5511999998888',
        type: 'avulsa',
        valorReais: 50, // Asaas manda reais; gravamos reais no Brevo
        subscriptionId: null,
      }),
    );
  });

  it('recorrente (subscription preenchido): tipo recorrente + subscriptionId', async () => {
    await handleAsaasEvent({
      event: 'PAYMENT_CONFIRMED',
      payment: { customer: 'cus_1', value: 20, subscription: 'sub_99' },
    });

    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'recorrente',
        valorReais: 20,
        subscriptionId: 'sub_99',
      }),
    );
  });

  it('ignora se o cliente não tem e-mail (sem chave de upsert)', async () => {
    mockGetCustomer.mockResolvedValue({ id: 'cus_1' });
    await handleAsaasEvent({
      event: 'PAYMENT_CONFIRMED',
      payment: { customer: 'cus_1', value: 50, subscription: null },
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });
});

describe('PAYMENT_OVERDUE (#9)', () => {
  it('marca falha de pagamento pelo e-mail do cliente', async () => {
    await handleAsaasEvent({
      event: 'PAYMENT_OVERDUE',
      payment: { customer: 'cus_1', value: 20, subscription: 'sub_99' },
    });
    expect(mockFailed).toHaveBeenCalledWith('maria@exemplo.com');
  });
});

describe('SUBSCRIPTION_DELETED (#9)', () => {
  it('marca a assinatura como inativa pelo e-mail do cliente', async () => {
    await handleAsaasEvent({
      event: 'SUBSCRIPTION_DELETED',
      subscription: { customer: 'cus_1' },
    });
    expect(mockInactive).toHaveBeenCalledWith('maria@exemplo.com');
  });
});

describe('eventos ignorados', () => {
  it('não faz nada num evento não mapeado (ex.: PAYMENT_RECEIVED)', async () => {
    await handleAsaasEvent({
      event: 'PAYMENT_RECEIVED',
      payment: { customer: 'cus_1', value: 50, subscription: null },
    });
    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockFailed).not.toHaveBeenCalled();
    expect(mockInactive).not.toHaveBeenCalled();
  });
});
