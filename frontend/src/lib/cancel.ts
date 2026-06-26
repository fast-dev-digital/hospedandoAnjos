// =============================================================================
// lib/cancel.ts — cancelamento de doação recorrente pelo link do e-mail.
//
// FLUXO REAL: o e-mail (Brevo, {{LINK_CANCELAMENTO}}) traz …/cancelar?t=<token>.
// A página /cancelar chama GET {API_BASE}/cancelar?t=<token>; o backend valida o
// token assinado (subscription_id) e chama DELETE /subscriptions/{id} no Asaas.
// 1 clique cancela, sem confirmação (ADR-0005 #3). Aqui só disparamos e mapeamos
// a resposta para um estado de UI.
//
// HOJE: sem VITE_API_BASE_URL usamos um MOCK (paridade com lib/checkout.ts), para
// validar a UI ponta a ponta sem backend. Quando a API subir, basta a env var.
// =============================================================================

const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

// quanto esperar pela API antes de desistir (vira estado 'error').
const TIMEOUT_MS = 10_000;

/** Resultado discriminado que a página /cancelar renderiza. */
export interface CancelResult {
  status: 'success' | 'invalid' | 'error';
  /** Mensagem vinda do backend (sucesso/inválido); ausente em erro genérico. */
  message?: string;
}

export async function cancelDonation(token: string): Promise<CancelResult> {
  // sem token na URL não há o que cancelar — trata como link inválido.
  if (!token) {
    return { status: 'invalid', message: 'Link inválido ou expirado.' };
  }

  if (!API_BASE) {
    return mockCancelDonation();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${API_BASE}/cancelar?t=${encodeURIComponent(token)}`,
      { signal: controller.signal },
    );
    // o corpo pode não ser JSON (ex.: 500 com HTML); não deixar o parse derrubar.
    const body = (await res.json().catch(() => null)) as
      | { ok?: boolean; message?: string }
      | null;

    if (res.ok && body?.ok) {
      return { status: 'success', message: body.message };
    }
    if (res.status === 400 || body?.ok === false) {
      return { status: 'invalid', message: body?.message };
    }
    return { status: 'error' };
  } catch {
    // timeout (abort) ou falha de rede.
    return { status: 'error' };
  } finally {
    clearTimeout(timer);
  }
}

// --- Mock de desenvolvimento -------------------------------------------------
async function mockCancelDonation(): Promise<CancelResult> {
  await new Promise((r) => setTimeout(r, 700)); // simula latência de rede
  // eslint-disable-next-line no-console
  console.info('[mock] GET /cancelar');
  return {
    status: 'success',
    message:
      'Sua doação recorrente foi cancelada. Obrigado por ter apoiado o Hospedando Anjos. 💛',
  };
}
