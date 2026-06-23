import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { createCheckoutSession, constructWebhookEvent } from './integrations/stripe.js';
import { handleStripeEvent } from './services/webhook.service.js';

// Mocka o adapter da Stripe: o teste sobe a app HTTP de verdade, mas NÃO toca
// o SDK real nem precisa de chave. Testa a cadeia req -> rota -> controller ->
// service -> (stripe mockada) -> resposta, e o errorHandler.
vi.mock('./integrations/stripe.js', () => ({
  createCheckoutSession: vi.fn(),
  constructWebhookEvent: vi.fn(),
}));

// Mocka o webhook.service: aqui só verificamos a borda HTTP (raw body, status).
vi.mock('./services/webhook.service.js', () => ({
  handleStripeEvent: vi.fn(),
}));

const mockedCreate = vi.mocked(createCheckoutSession);
const mockedConstruct = vi.mocked(constructWebhookEvent);
const mockedHandle = vi.mocked(handleStripeEvent);
const app = createApp();

// amountInCents no payload do front vem em REAIS; o backend converte.
const bodyValido = {
  type: 'avulsa',
  amountInCents: 50, // R$50,00
  name: 'Maria Silva',
  email: 'maria@exemplo.com',
  whatsapp: '+5511999998888',
};

describe('app (integração HTTP)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('responde 200 { ok: true } — a app subiu', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe('POST /checkout', () => {
    it('payload válido → 200 com a checkoutUrl (Stripe mockada)', async () => {
      mockedCreate.mockResolvedValue('https://checkout.stripe.com/c/pay/abc123');

      const res = await request(app).post('/checkout').send(bodyValido);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ checkoutUrl: 'https://checkout.stripe.com/c/pay/abc123' });
    });

    it('payload inválido → 400 e NÃO chama a Stripe', async () => {
      const res = await request(app)
        .post('/checkout')
        .send({ ...bodyValido, amountInCents: 0.5 }); // R$0,50 abaixo do mínimo avulsa (R$1)

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('body vazio → 400', async () => {
      const res = await request(app).post('/checkout').send({});

      expect(res.status).toBe(400);
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('recorrente válido (R$20) → 200 e repassa type=recorrente à Stripe (em centavos)', async () => {
      mockedCreate.mockResolvedValue('https://checkout.stripe.com/c/pay/sub');

      const res = await request(app)
        .post('/checkout')
        .send({ ...bodyValido, type: 'recorrente', amountInCents: 20 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ checkoutUrl: 'https://checkout.stripe.com/c/pay/sub' });
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'recorrente', amountInCents: 2000 }),
      );
    });

    it('recorrente abaixo do mínimo (R$19,99) → 400 e NÃO chama a Stripe', async () => {
      const res = await request(app)
        .post('/checkout')
        .send({ ...bodyValido, type: 'recorrente', amountInCents: 19.99 });

      expect(res.status).toBe(400);
      expect(mockedCreate).not.toHaveBeenCalled();
    });
  });

  describe('POST /webhooks/stripe', () => {
    it('assinatura válida → 200 { received:true } e processa o evento', async () => {
      const fakeEvent = { type: 'checkout.session.completed' };
      mockedConstruct.mockReturnValue(fakeEvent as never);
      mockedHandle.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', 't=1,v1=abc')
        .set('content-type', 'application/json')
        .send(Buffer.from(JSON.stringify({ id: 'evt_1' })));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
      expect(mockedHandle).toHaveBeenCalledWith(fakeEvent);
    });

    it('recebe o RAW body (Buffer) — não foi parseado pelo express.json', async () => {
      mockedConstruct.mockReturnValue({ type: 'x' } as never);
      mockedHandle.mockResolvedValue(undefined);

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', 't=1,v1=abc')
        .set('content-type', 'application/json')
        .send(Buffer.from('{"id":"evt_1"}'));

      expect(Buffer.isBuffer(mockedConstruct.mock.calls[0]![0])).toBe(true);
    });

    it('assinatura inválida → 400 e NÃO processa', async () => {
      mockedConstruct.mockImplementation(() => {
        throw new Error('bad signature');
      });

      const res = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', 'ruim')
        .set('content-type', 'application/json')
        .send(Buffer.from('{}'));

      expect(res.status).toBe(400);
      expect(mockedHandle).not.toHaveBeenCalled();
    });

    it('sem header stripe-signature → 400', async () => {
      const res = await request(app)
        .post('/webhooks/stripe')
        .set('content-type', 'application/json')
        .send(Buffer.from('{}'));

      expect(res.status).toBe(400);
      expect(mockedConstruct).not.toHaveBeenCalled();
    });

    it('erro interno ao processar → ainda responde 200 (idempotente, evita retry)', async () => {
      mockedConstruct.mockReturnValue({ type: 'checkout.session.completed' } as never);
      mockedHandle.mockRejectedValue(new Error('brevo caiu'));

      const res = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', 't=1,v1=abc')
        .set('content-type', 'application/json')
        .send(Buffer.from('{}'));

      expect(res.status).toBe(200);
    });
  });
});
