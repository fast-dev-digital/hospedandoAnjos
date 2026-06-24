// =============================================================================
// integrations/asaas.ts — adapter da API do Asaas. Isola o gateway (ADR-0002).
// =============================================================================
// Substitui o antigo stripe.ts (ver ADR-0005). Só transporte HTTP (fetch nativo
// do Node 22), sem SDK. O Asaas autentica por header `access_token`.
//
// Esta issue (#5) entrega a camada de CLIENTE (find-or-create + get). Cobrança,
// assinatura e cancelamento entram nas issues seguintes.
// =============================================================================

import { env } from '../config/env.js';

function headers() {
  return {
    access_token: env.ASAAS_API_KEY,
    'content-type': 'application/json',
    accept: 'application/json',
  };
}

// joga o erro do Asaas pra cima com o status e o corpo (p/ debug).
async function fail(res: { status: number; text: () => Promise<string> }, op: string): Promise<never> {
  const body = await res.text();
  throw new Error(`Asaas ${op} falhou (${res.status}): ${body}`);
}

// dados do doador p/ criar o cliente. cpf vira cpfCnpj (nome do campo no Asaas).
export interface CustomerInput {
  name: string;
  email: string;
  mobilePhone: string; // E.164
  cpf: string;
}

export interface AsaasCustomer {
  id: string;
  name?: string;
  email?: string;
  mobilePhone?: string;
  cpfCnpj?: string;
}

// Reusa o cliente por e-mail (Asaas permite duplicados; nós evitamos buscando
// antes). Se existe, devolve o id; se não, cria. Mantém o backend stateless.
export async function findOrCreateCustomer(d: CustomerInput): Promise<string> {
  const search = await fetch(
    `${env.ASAAS_BASE_URL}/customers?email=${encodeURIComponent(d.email)}`,
    { method: 'GET', headers: headers() },
  );
  if (!search.ok) await fail(search, 'busca de cliente');

  const found = (await search.json()) as { data?: Array<{ id: string }> };
  if (found.data && found.data.length > 0) {
    return found.data[0]!.id;
  }

  const created = await fetch(`${env.ASAAS_BASE_URL}/customers`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      name: d.name,
      email: d.email,
      mobilePhone: d.mobilePhone,
      cpfCnpj: d.cpf,
    }),
  });
  if (!created.ok) await fail(created, 'criação de cliente');

  const customer = (await created.json()) as AsaasCustomer;
  return customer.id;
}

// Lê o cliente por id (o webhook usa p/ obter nome/telefone/CPF — a fonte da
// verdade do doador é o cliente no Asaas, não o metadata do evento).
export async function getCustomer(id: string): Promise<AsaasCustomer> {
  const res = await fetch(`${env.ASAAS_BASE_URL}/customers/${id}`, {
    method: 'GET',
    headers: headers(),
  });
  if (!res.ok) await fail(res, 'busca de cliente por id');
  return (await res.json()) as AsaasCustomer;
}

// valor em centavos -> reais (o Asaas trabalha em reais decimais; nosso payload
// interno é centavos). Ex.: 2000 -> 20.00.
function toReais(cents: number): number {
  return cents / 100;
}

// data de hoje em YYYY-MM-DD (formato do dueDate/nextDueDate do Asaas).
function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function callback() {
  return { successUrl: `${env.FRONTEND_ORIGIN}/obrigado`, autoRedirect: true };
}

// cobrança AVULSA. billingType UNDEFINED -> a página hospedada mostra os métodos
// habilitados na conta (PIX + cartão; boleto deve estar DESABILITADO na conta).
// Devolve a invoiceUrl (página de pagamento hospedada) p/ o front redirecionar.
export async function createPayment(input: {
  customerId: string;
  amountInCents: number;
}): Promise<string> {
  const res = await fetch(`${env.ASAAS_BASE_URL}/payments`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      customer: input.customerId,
      billingType: 'UNDEFINED',
      value: toReais(input.amountInCents),
      dueDate: hoje(),
      description: 'Doação Hospedando Anjos',
      callback: callback(),
    }),
  });
  if (!res.ok) await fail(res, 'criação de cobrança');

  const payment = (await res.json()) as { invoiceUrl?: string };
  if (!payment.invoiceUrl) {
    throw new Error('Asaas não retornou invoiceUrl da cobrança');
  }
  return payment.invoiceUrl;
}

// assinatura RECORRENTE mensal, só cartão. A 1ª cobrança é criada DEPOIS da
// assinatura (não vem na resposta) -> buscamos via GET /subscriptions/{id}/payments
// p/ obter a invoiceUrl. (Documentado: assinatura não retorna a cobrança na criação.)
export async function createSubscription(input: {
  customerId: string;
  amountInCents: number;
}): Promise<string> {
  const res = await fetch(`${env.ASAAS_BASE_URL}/subscriptions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      customer: input.customerId,
      billingType: 'CREDIT_CARD',
      value: toReais(input.amountInCents),
      nextDueDate: hoje(),
      cycle: 'MONTHLY',
      description: 'Doação Hospedando Anjos (recorrente)',
      callback: callback(),
    }),
  });
  if (!res.ok) await fail(res, 'criação de assinatura');

  const sub = (await res.json()) as { id?: string };
  if (!sub.id) throw new Error('Asaas não retornou o id da assinatura');

  // 2º passo: buscar a 1ª cobrança da assinatura p/ pegar a invoiceUrl.
  const pays = await fetch(`${env.ASAAS_BASE_URL}/subscriptions/${sub.id}/payments`, {
    method: 'GET',
    headers: headers(),
  });
  if (!pays.ok) await fail(pays, 'busca da 1ª cobrança da assinatura');

  const list = (await pays.json()) as { data?: Array<{ invoiceUrl?: string }> };
  const url = list.data?.[0]?.invoiceUrl;
  if (!url) {
    throw new Error('Asaas não retornou invoiceUrl da 1ª cobrança da assinatura');
  }
  return url;
}
