import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAsaasEvent } from './webhook.service.js';
import { getCustomer } from '../integrations/asaas.js';
import { sendReceiptEmail } from '../integrations/brevo.js';
import { sendWhatsAppReceipt } from '../integrations/n8n.js';
import {
  registerDonation,
  markPaymentFailed,
  markSubscriptionInactive,
} from './donor.service.js';

// Mockamos o adapter do Asaas e o donor.service: o teste verifica o ROTEAMENTO do
// evento (qual ação dispara, com quais dados), não o HTTP nem a regra do Brevo.
vi.mock('../integrations/asaas.js', () => ({ getCustomer: vi.fn() }));
vi.mock('../integrations/brevo.js', () => ({ sendReceiptEmail: vi.fn() }));
vi.mock('../integrations/n8n.js', () => ({ sendWhatsAppReceipt: vi.fn() }));
vi.mock('./donor.service.js', () => ({
  registerDonation: vi.fn(),
  markPaymentFailed: vi.fn(),
  markSubscriptionInactive: vi.fn(),
  // o webhook usa linkCancelamento p/ montar o LINK_CANCELAMENTO do recibo.
  linkCancelamento: vi.fn((id: string) => `https://front/cancelar?t=tok_${id}`),
}));

const mockGetCustomer = vi.mocked(getCustomer);
const mockRegister = vi.mocked(registerDonation);
const mockFailed = vi.mocked(markPaymentFailed);
const mockInactive = vi.mocked(markSubscriptionInactive);
const mockEmail = vi.mocked(sendReceiptEmail);
const mockWhats = vi.mocked(sendWhatsAppReceipt);

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

  it('dispara recibo: e-mail transacional + WhatsApp (avulsa, sem link)', async () => {
    await handleAsaasEvent({
      event: 'PAYMENT_CONFIRMED',
      payment: { customer: 'cus_1', value: 50, subscription: null },
    });

    expect(mockEmail).toHaveBeenCalledWith('maria@exemplo.com', {
      NOME: 'Maria Silva',
      VALOR: 50,
      TIPO: 'avulsa',
      LINK_CANCELAMENTO: undefined,
    });
    expect(mockWhats).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'maria@exemplo.com',
        attributes: expect.objectContaining({
          WHATSAPP_NUM: '+5511999998888',
          TIPO_ULTIMA: 'avulsa',
        }),
      }),
    );
  });

  it('recorrente: recibo leva LINK_CANCELAMENTO montado do subscription', async () => {
    await handleAsaasEvent({
      event: 'PAYMENT_CONFIRMED',
      payment: { customer: 'cus_1', value: 20, subscription: 'sub_99' },
    });

    expect(mockEmail).toHaveBeenCalledWith(
      'maria@exemplo.com',
      expect.objectContaining({
        TIPO: 'recorrente',
        LINK_CANCELAMENTO: 'https://front/cancelar?t=tok_sub_99',
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

describe('PAYMENT_RECEIVED (bug PIX): PIX cai só aqui, sem passar pelo CONFIRMED', () => {
  it('PIX: registra a doação e dispara recibo (o PIX não emite CONFIRMED)', async () => {
    await handleAsaasEvent({
      event: 'PAYMENT_RECEIVED',
      payment: { customer: 'cus_1', value: 50, subscription: null, billingType: 'PIX' },
    });
    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'avulsa', valorReais: 50 }),
    );
    expect(mockEmail).toHaveBeenCalled();
  });

  it('cartão: NÃO reprocessa no RECEIVED (o CONFIRMED já cadastrou; evita recibo dobrado)', async () => {
    await handleAsaasEvent({
      event: 'PAYMENT_RECEIVED',
      payment: { customer: 'cus_1', value: 50, subscription: null, billingType: 'CREDIT_CARD' },
    });
    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockEmail).not.toHaveBeenCalled();
  });

  it('boleto: NÃO reprocessa no RECEIVED (idem cartão)', async () => {
    await handleAsaasEvent({
      event: 'PAYMENT_RECEIVED',
      payment: { customer: 'cus_1', value: 50, subscription: null, billingType: 'BOLETO' },
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });
});

describe('eventos ignorados', () => {
  it('não faz nada num evento não mapeado (ex.: PAYMENT_CREATED)', async () => {
    await handleAsaasEvent({
      event: 'PAYMENT_CREATED',
      payment: { customer: 'cus_1', value: 50, subscription: null },
    });
    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockFailed).not.toHaveBeenCalled();
    expect(mockInactive).not.toHaveBeenCalled();
  });
});
