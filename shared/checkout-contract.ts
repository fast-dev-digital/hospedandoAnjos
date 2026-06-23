// =============================================================================
// CONTRATO DE CHECKOUT — compartilhado entre frontend e backend
// =============================================================================
// CONTEXT.md: "Tipo do contrato de checkout compartilhado entre os dois lados
// (evita divergência de payload)."
//
// Regras de valor (validadas SEMPRE no backend, nunca confiar no browser):
//   - avulsa     -> mínimo 100 centavos (R$1,00)
//   - recorrente -> mínimo 2000 centavos (R$20,00)
// WhatsApp -> obrigatório, E.164 com código de país (+55119...). Sem default +55.
// Sem project_target (segmentação por projeto foi removida do escopo).
// =============================================================================

export type DonationType = 'avulsa' | 'recorrente';

/** Payload que o FRONTEND envia ao `POST /checkout`. */
export interface CheckoutRequest {
  type: DonationType;
  /** Valor em centavos; o backend revalida o mínimo conforme o `type`. */
  amountInCents: number;
  name: string;
  email: string;
  /** E.164 com código de país; o backend normaliza/rejeita. */
  whatsapp: string;
}

/** Resposta do BACKEND: URL hospedada da Stripe para o frontend redirecionar. */
export interface CheckoutResponse {
  checkoutUrl: string;
}
