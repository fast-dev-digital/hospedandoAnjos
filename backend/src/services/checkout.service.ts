// =============================================================================
// services/checkout.service.ts — orquestra a criação do Checkout.
// =============================================================================
// PSEUDOCÓDIGO / GUIA:
//
//   import { validateCheckout } from '../lib/validation';
//   import { createCheckoutSession } from '../integrations/stripe';
//
//   export async function startCheckout(body): { checkoutUrl }
//     1. result = validateCheckout(body)           // money + phone E.164 + campos
//        se !result.ok -> throw ValidationError(result.errors)   // 400 no controller
//     2. url = await createCheckoutSession(result.value)  // decide mode + métodos
//     3. return { checkoutUrl: url }
//
// Service NÃO conhece Express (req/res). Recebe dados, devolve dados/erros.
// =============================================================================
import { validateCheckout } from '../lib/validation.js';
import { createCheckoutSession } from '../integrations/stripe.js';
import { ValidationError } from '../lib/errors.js';

export async function startCheckout(body: unknown): Promise<{ checkoutUrl: string}> {
    const result = validateCheckout(body);
    if (!result.ok) {
        throw new ValidationError(result.errors.join(', ')); 
    }
    const checkoutUrl = await createCheckoutSession(result.value);
    return { checkoutUrl };
}