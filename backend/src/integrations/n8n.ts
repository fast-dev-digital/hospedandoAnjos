// =============================================================================
// integrations/n8n.ts — chama o webhook do n8n que envia o recibo por WhatsApp.
// =============================================================================
// O backend chama o n8n DIRETO no PAYMENT_CONFIRMED (instantâneo), em vez de
// depender da automação de marketing do Brevo (que tinha 11-26 min de latência).
// O n8n busca o contato no Brevo pelo e-mail e dispara o template via Manychat.
//
// Formato do body: o MESMO que o Brevo mandava (body.email + body.attributes),
// pro workflow do n8n não precisar mudar — ele lê `$json.body.email` e busca o
// resto no Brevo. Mandamos os atributos também, por robustez.
// =============================================================================

import { env } from '../config/env.js';

export interface N8nReceiptPayload {
  email: string;
  attributes: {
    NOME: string;
    WHATSAPP_NUM: string; // E.164 (+55...)
    VALOR_ULTIMA: number;
    TIPO_ULTIMA: string;
    LINK_CANCELAMENTO?: string;
  };
}

// Dispara o recibo de WhatsApp via n8n. No-op se N8N_WEBHOOK_URL não estiver
// setado (dev local). Não relança erro fatal: o WhatsApp não pode derrubar o
// webhook (o cadastro no Brevo e o e-mail já foram feitos); só registra.
export async function sendWhatsAppReceipt(payload: N8nReceiptPayload): Promise<void> {
  if (!env.N8N_WEBHOOK_URL) return;

  try {
    const res = await fetch(env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // o n8n lê `body.email`/`body.attributes` (mesma forma do payload do Brevo).
      body: JSON.stringify({ body: payload }),
    });
    if (!res.ok) {
      console.error(`n8n sendWhatsAppReceipt falhou (${res.status}): ${await res.text()}`);
    }
  } catch (e) {
    console.error('n8n sendWhatsAppReceipt erro de rede:', e);
  }
}
