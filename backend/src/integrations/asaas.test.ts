import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  findOrCreateCustomer,
  getCustomer,
  createPayment,
  createSubscription,
} from './asaas.js';

// Mocka o fetch global: o adapter fala com o Asaas por HTTP (sem SDK). Capturamos
// a chamada p/ verificar endpoint, método, headers e body — sem tocar a rede.
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

// helper: resposta fake do fetch
function ok(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const donor = {
  name: 'Maria Silva',
  email: 'maria@exemplo.com',
  mobilePhone: '+5511999998888',
  cpf: '12345678909',
};

describe('findOrCreateCustomer', () => {
  it('reusa o cliente existente quando a busca por e-mail retorna um', async () => {
    // 1ª chamada: GET /customers?email= -> já existe
    fetchMock.mockResolvedValueOnce(ok({ data: [{ id: 'cus_existente' }] }));

    const id = await findOrCreateCustomer(donor);

    expect(id).toBe('cus_existente');
    // só buscou; NÃO criou
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/customers?email=maria%40exemplo.com');
    expect(opts.method).toBe('GET');
    expect(opts.headers.access_token).toBe('asaas_fake');
  });

  it('cria um cliente novo quando a busca não retorna nenhum', async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ data: [] })) // busca vazia
      .mockResolvedValueOnce(ok({ id: 'cus_novo' })); // POST cria

    const id = await findOrCreateCustomer(donor);

    expect(id).toBe('cus_novo');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, postOpts] = fetchMock.mock.calls[1]!;
    expect(postOpts.method).toBe('POST');
    const sent = JSON.parse(postOpts.body);
    expect(sent).toMatchObject({
      name: 'Maria Silva',
      email: 'maria@exemplo.com',
      mobilePhone: '11999998888', // E.164 sem +55: Asaas quer DDD+número nacional
      cpfCnpj: '12345678909', // o adapter mapeia cpf -> cpfCnpj (campo do Asaas)
    });
  });

  it('lança se o Asaas responder erro na criação', async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ data: [] }))
      .mockResolvedValueOnce(ok({ errors: [{ description: 'CPF inválido' }] }, 400));

    await expect(findOrCreateCustomer(donor)).rejects.toThrow(/Asaas/);
  });
});

describe('getCustomer', () => {
  it('busca o cliente por id e devolve os dados', async () => {
    fetchMock.mockResolvedValueOnce(
      ok({ id: 'cus_1', name: 'Maria Silva', mobilePhone: '+5511999998888', cpfCnpj: '12345678909' }),
    );

    const c = await getCustomer('cus_1');

    expect(c).toMatchObject({ id: 'cus_1', name: 'Maria Silva' });
    const [url, opts] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/customers/cus_1');
    expect(opts.method).toBe('GET');
  });
});

describe('createPayment (avulsa)', () => {
  it('cria cobrança UNDEFINED em reais e devolve a invoiceUrl', async () => {
    fetchMock.mockResolvedValueOnce(ok({ id: 'pay_1', invoiceUrl: 'https://asaas.com/i/abc' }));

    const url = await createPayment({ customerId: 'cus_1', amountInCents: 5000 });

    expect(url).toBe('https://asaas.com/i/abc');
    const [reqUrl, opts] = fetchMock.mock.calls[0]!;
    expect(String(reqUrl)).toContain('/payments');
    const sent = JSON.parse(opts.body);
    expect(sent).toMatchObject({
      customer: 'cus_1',
      billingType: 'UNDEFINED', // PIX + cartão (boleto desabilitado na conta)
      value: 50, // 5000 centavos -> 50.00 reais
    });
    expect(sent.callback).toMatchObject({ autoRedirect: true });
  });

  it('lança se o Asaas não retornar invoiceUrl', async () => {
    fetchMock.mockResolvedValueOnce(ok({ id: 'pay_1' }));
    await expect(createPayment({ customerId: 'cus_1', amountInCents: 5000 })).rejects.toThrow(
      /invoiceUrl/,
    );
  });
});

describe('createSubscription (recorrente)', () => {
  it('cria assinatura mensal só cartão e busca a 1ª cobrança p/ a invoiceUrl', async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ id: 'sub_1' })) // POST /subscriptions
      .mockResolvedValueOnce(ok({ data: [{ invoiceUrl: 'https://asaas.com/i/sub' }] })); // GET payments

    const url = await createSubscription({ customerId: 'cus_1', amountInCents: 2000 });

    expect(url).toBe('https://asaas.com/i/sub');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, subOpts] = fetchMock.mock.calls[0]!;
    const sent = JSON.parse(subOpts.body);
    expect(sent).toMatchObject({
      customer: 'cus_1',
      billingType: 'CREDIT_CARD', // recorrente = só cartão
      cycle: 'MONTHLY',
      value: 20,
    });
    const [payUrl, payOpts] = fetchMock.mock.calls[1]!;
    expect(String(payUrl)).toContain('/subscriptions/sub_1/payments');
    expect(payOpts.method).toBe('GET');
  });

  it('lança se não conseguir a invoiceUrl da 1ª cobrança', async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ id: 'sub_1' }))
      .mockResolvedValueOnce(ok({ data: [] }));
    await expect(createSubscription({ customerId: 'cus_1', amountInCents: 2000 })).rejects.toThrow(
      /invoiceUrl/,
    );
  });
});
