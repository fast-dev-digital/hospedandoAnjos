import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import {
  findOrCreateCustomer,
  createPayment,
  createSubscription,
  cancelSubscriptionById,
} from './integrations/asaas.js';
import { signSubscriptionToken } from './lib/billing-token.js';

// Mocka o adapter do Asaas: sobe a app HTTP de verdade, mas NÃO toca a rede.
// Testa a cadeia req -> rota -> controller -> service -> (asaas mockado) -> resposta.
vi.mock('./integrations/asaas.js', () => ({
  findOrCreateCustomer: vi.fn(),
  createPayment: vi.fn(),
  createSubscription: vi.fn(),
  cancelSubscriptionById: vi.fn(),
}));

const mockCustomer = vi.mocked(findOrCreateCustomer);
const mockPayment = vi.mocked(createPayment);
const mockSubscription = vi.mocked(createSubscription);
const mockCancel = vi.mocked(cancelSubscriptionById);
const app = createApp();

const bodyValido = {
  type: 'avulsa',
  amountInCents: 5000, // R$50,00 (centavos)
  name: 'Maria Silva',
  email: 'maria@exemplo.com',
  whatsapp: '+5511999998888',
  cpf: '529.982.247-25',
};

describe('app (integração HTTP)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCustomer.mockResolvedValue('cus_123');
  });

  describe('GET /health', () => {
    it('responde 200 { ok: true }', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe('POST /checkout', () => {
    it('avulsa válida → 200 com a invoiceUrl (Asaas mockado)', async () => {
      mockPayment.mockResolvedValue('https://asaas.com/i/abc');

      const res = await request(app).post('/checkout').send(bodyValido);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ checkoutUrl: 'https://asaas.com/i/abc' });
    });

    it('recorrente válida → 200 e cria assinatura (em centavos)', async () => {
      mockSubscription.mockResolvedValue('https://asaas.com/i/sub');

      const res = await request(app)
        .post('/checkout')
        .send({ ...bodyValido, type: 'recorrente', amountInCents: 2000 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ checkoutUrl: 'https://asaas.com/i/sub' });
    });

    it('valor abaixo do mínimo → 400 e NÃO toca o Asaas', async () => {
      const res = await request(app).post('/checkout').send({ ...bodyValido, amountInCents: 50 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(mockCustomer).not.toHaveBeenCalled();
    });

    it('CPF inválido → 400', async () => {
      const res = await request(app)
        .post('/checkout')
        .send({ ...bodyValido, cpf: '111.111.111-11' });

      expect(res.status).toBe(400);
      expect(mockCustomer).not.toHaveBeenCalled();
    });

    it('body vazio → 400', async () => {
      const res = await request(app).post('/checkout').send({});
      expect(res.status).toBe(400);
      expect(mockCustomer).not.toHaveBeenCalled();
    });
  });

  // Webhook Asaas (#8/#9): sem o token do header `asaas-access-token`, rejeita 401
  // antes de tocar Asaas/Brevo. O roteamento por evento é testado em
  // webhook.service.test.ts (unitário).
  describe('webhook Asaas', () => {
    it('POST /webhooks/asaas sem token → 401', async () => {
      const res = await request(app).post('/webhooks/asaas').send({});
      expect(res.status).toBe(401);
    });
  });

  // Cancelamento (#10): GET /cancelar valida o token assinado (subscription_id) e
  // chama DELETE no Asaas. O STATUS=inativo no Brevo vem depois, pelo webhook.
  describe('cancelamento (GET /cancelar)', () => {
    it('token válido → cancela a assinatura no Asaas e responde 200', async () => {
      const token = signSubscriptionToken('sub_abc');
      const res = await request(app).get(`/cancelar?t=${token}`);

      expect(res.status).toBe(200);
      expect(mockCancel).toHaveBeenCalledWith('sub_abc');
    });

    it('token inválido → 400 e NÃO chama o Asaas', async () => {
      const res = await request(app).get('/cancelar?t=lixo-forjado');

      expect(res.status).toBe(400);
      expect(mockCancel).not.toHaveBeenCalled();
    });

    it('sem token → 400', async () => {
      const res = await request(app).get('/cancelar');
      expect(res.status).toBe(400);
      expect(mockCancel).not.toHaveBeenCalled();
    });
  });
});
