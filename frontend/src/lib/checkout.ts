import type {
  CheckoutRequest,
  CheckoutResponse,
} from '@shared/checkout-contract';

// =============================================================================
// Camada de checkout do front.
//
// FLUXO REAL: POST {API_BASE}/checkout -> backend cria a Stripe Checkout Session
// hospedada e devolve { checkoutUrl } -> o front redireciona para essa URL.
//
// HOJE: o backend do Gabriel ainda não existe. Enquanto VITE_API_BASE_URL não
// estiver definida, usamos um MOCK que simula a resposta. Quando a API subir,
// basta definir a env var — nada mais muda. Ver FRONT-END-CONTEXT.md §5.
// =============================================================================

const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

export async function createCheckout(
  req: CheckoutRequest,
): Promise<CheckoutResponse> {
  if (!API_BASE) {
    return mockCreateCheckout(req);
  }

  const res = await fetch(`${API_BASE}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    throw new Error(`Falha ao criar checkout (HTTP ${res.status}).`);
  }
  return (await res.json()) as CheckoutResponse;
}

// --- Mock de desenvolvimento -------------------------------------------------
async function mockCreateCheckout(
  req: CheckoutRequest,
): Promise<CheckoutResponse> {
  await new Promise((r) => setTimeout(r, 700)); // simula latência de rede
  // eslint-disable-next-line no-console
  console.info('[mock] POST /checkout', req);
  // Sem backend ainda: devolvemos a própria /obrigado como destino do "redirect",
  // para validar o fluxo de UI ponta a ponta sem cobrar ninguém.
  return { checkoutUrl: `${window.location.origin}/obrigado` };
}
