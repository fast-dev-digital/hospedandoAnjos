import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import {
  findOrCreateCustomer,
  createPayment,
  createSubscription,
} from './integrations/asaas.js';

// Mocka o adapter do Asaas: sobe a app HTTP de verdade, mas NÃO toca a rede.
// Testa a cadeia req -> rota -> controller -> service -> (asaas mockado) -> resposta.
vi.mock('./integrations/asaas.js', () => ({
  findOrCreateCustomer: vi.fn(),
  createPayment: vi.fn(),
  createSubscription: vi.fn(),
}));

const mockCustomer = vi.mocked(findOrCreateCustomer);
const mockPayment = vi.mocked(createPayment);
const mockSubscription = vi.mocked(createSubscription);
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

  // EM MIGRAÇÃO (ADR-0005): webhook e cancelamento Asaas serão implementados nas
  // issues #8/#10. Por ora respondem 501.
  describe('rotas em migração', () => {
    it('POST /webhooks/asaas → 501', async () => {
      const res = await request(app).post('/webhooks/asaas').send({});
      expect(res.status).toBe(501);
    });

    it('GET /cancelar → 501', async () => {
      const res = await request(app).get('/cancelar?t=qualquer');
      expect(res.status).toBe(501);
    });
  });
});
