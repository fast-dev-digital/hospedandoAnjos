// =============================================================================
// services/webhook.service.ts — roteia os eventos do webhook do gateway.
// =============================================================================
// EM MIGRAÇÃO (ADR-0005): a versão Stripe foi removida. A versão Asaas roteará
// PAYMENT_CONFIRMED (cadastro no Brevo), PAYMENT_OVERDUE (falha) e
// SUBSCRIPTION_DELETED (inativo) — ver issues #8/#9. O donor.service (lógica de
// upsert no Brevo) é reaproveitado por essas issues.
// =============================================================================

// Placeholder até a issue do webhook Asaas. Mantém o módulo compilável.
export async function handleAsaasEvent(_event: unknown): Promise<void> {
  // implementado na issue do webhook (#8).
}
