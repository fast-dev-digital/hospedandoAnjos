# 3. Métodos de pagamento: cartão e PIX, sem carteiras digitais

Data: 2026-06-17

## Status

Aceito

## Contexto

O PRD coloca Apple Pay / Google Pay (via Payment Request Button) como peça
central da meta "fricção zero / checkout < 20s", com autenticação biométrica.
Porém:

- A decisão ADR-0001 já trocou Elements embutido por Checkout hospedado.
- Foi pedido simplificar o checkout para **apenas cartão de crédito e PIX**.
- O público pode incluir doadores fora do Brasil, mas PIX só vale no Brasil e
  carteiras digitais foram dispensadas.

Restrição técnica relevante da Stripe: **PIX não funciona em `mode:
subscription`** (não há cobrança recorrente via PIX).

## Decisão

Ofertar **apenas cartão e PIX**, condicionados ao tipo de doação:

- **Avulsa** (`mode: payment`): cartão + PIX.
- **Recorrente** (`mode: subscription`): só cartão.

Sem Apple Pay / Google Pay. `payment_method_types` definido pelo backend
conforme o tipo.

## Consequências

- Checkout mais simples e previsível; sem variação por carteira/dispositivo.
- Como o Checkout é hospedado pela Stripe, **não há verificação de domínio da
  Apple** a fazer (vantagem herdada do ADR-0001).
- Perde-se a conveniência da biometria / pagamento em um toque que o PRD
  valorizava. Aceitável: o redirect hospedado já é rápido e o foco é simplicidade
  no prazo.
- Doador recorrente é obrigatoriamente cartão — PIX recorrente não existe na
  Stripe. Comunicar isso na UI do toggle recorrente, se necessário.
- Reativar carteiras digitais no futuro é barato (adicionar aos métodos do
  Checkout), não exige reescrita.
