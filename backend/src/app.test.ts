import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { createCheckoutSession } from './integrations/stripe.js';

// Mocka o adapter da Stripe: o teste sobe a app HTTP de verdade, mas NÃO toca
// o SDK real nem precisa de chave. Testa a cadeia req -> rota -> controller ->
// service -> (stripe mockada) -> resposta, e o errorHandler.
vi.mock('./integrations/stripe.js', () => ({
  createCheckoutSession: vi.fn(),
}));

const mockedCreate = vi.mocked(createCheckoutSession);
const app = createApp();

const bodyValido = {
  type: 'avulsa',
  amountInCents: 5000,
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
        .send({ ...bodyValido, amountInCents: 50 }); // abaixo do mínimo avulsa

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('body vazio → 400', async () => {
      const res = await request(app).post('/checkout').send({});

      expect(res.status).toBe(400);
      expect(mockedCreate).not.toHaveBeenCalled();
    });
  });
});
