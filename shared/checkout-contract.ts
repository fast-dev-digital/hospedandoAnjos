// =============================================================================
// CONTRATO DE CHECKOUT — compartilhado entre frontend e backend
// =============================================================================
// CONTEXT.md: "Tipo do contrato de checkout compartilhado entre os dois lados
// (evita divergência de payload)."
//
// PSEUDOCÓDIGO / GUIA:
//
// 1. Definir o tipo da doação (sem project_target — foi removido do escopo).
// 2. O payload que o FRONTEND envia ao POST /checkout.
// 3. A resposta que o BACKEND devolve (URL do Stripe Checkout hospedado).
//
// Regras de valor (validadas SEMPRE no backend, nunca confiar no browser):
//   - avulsa     -> mínimo 100 centavos (R$1,00)
//   - recorrente -> mínimo 2000 centavos (R$20,00)
// WhatsApp -> obrigatório, E.164 com código de país (+55119...). Sem default +55.
// =============================================================================

// export type DonationType = 'avulsa' | 'recorrente';

// export interface CheckoutRequest {
//   type: DonationType;
//   amountInCents: number;   // valor em centavos; backend revalida o mínimo
//   name: string;
//   email: string;
//   whatsapp: string;        // E.164; backend normaliza/rejeita
// }

// export interface CheckoutResponse {
//   checkoutUrl: string;     // URL hospedada da Stripe -> frontend faz redirect
// }

export type DonationType = 'avulsa' | 'recorrente';

export interface CheckoutRequest {
  type: DonationType;
  amountInCents: number;   
  name: string;
  email: string;
  whatsapp: string;        
}

export interface CheckoutResponse {
  checkoutUrl: string;     
}