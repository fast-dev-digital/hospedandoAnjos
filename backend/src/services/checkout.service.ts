// =============================================================================
// services/checkout.service.ts — orquestra a criação do checkout (Asaas).
// =============================================================================
// Fluxo (ver ADR-0005):
//   1. valida o payload (money + phone E.164 + CPF + campos)
//   2. cria/reusa o cliente no Asaas (find-or-create por e-mail)
//   3. avulsa  -> cria cobrança (PIX+cartão via UNDEFINED)
//      recorrente -> cria assinatura mensal (só cartão)
//   4. devolve { checkoutUrl } = invoiceUrl (página hospedada do Asaas)
//
// Service NÃO conhece Express (req/res). Recebe dados, devolve dados/erros.
// =============================================================================
import { validateCheckout } from '../lib/validation.js';
import {
  findOrCreateCustomer,
  createPayment,
  createSubscription,
} from '../integrations/asaas.js';
import { ValidationError } from '../lib/errors.js';

export async function startCheckout(body: unknown): Promise<{ checkoutUrl: string }> {
  const result = validateCheckout(body);
  if (!result.ok) {
    throw new ValidationError(result.errors.join(', '));
  }
  const d = result.value;

  // cliente é a fonte da verdade do doador no Asaas (nome/telefone/CPF).
  const customerId = await findOrCreateCustomer({
    name: d.name,
    email: d.email,
    mobilePhone: d.whatsapp,
    cpf: d.cpf,
  });

  const checkoutUrl =
    d.type === 'recorrente'
      ? await createSubscription({ customerId, amountInCents: d.amountInCents })
      : await createPayment({ customerId, amountInCents: d.amountInCents });

  return { checkoutUrl };
}
