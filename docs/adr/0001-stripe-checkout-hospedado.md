# 1. Stripe Checkout hospedado em vez de Elements embutido

Data: 2026-06-17

## Status

Aceito

## Contexto

O PRD descreve dois caminhos de pagamento ao mesmo tempo: criação de Checkout
Sessions (`stripe.checkout.sessions.create`, que gera uma página hospedada pela
Stripe com redirect) e Stripe Elements + Payment Request Button (formulário
embutido na própria landing). A meta de produto é "fricção zero, checkout em
menos de 20 segundos".

São abordagens conflitantes:

- **Checkout hospedado (redirect)**: a Stripe entrega cartão, Apple Pay, Google
  Pay e PIX prontos; PCI mínimo; pouco código de frontend. O doador sai da
  landing para a tela da Stripe.
- **Elements embutido**: pagamento na própria landing, sem redirect; visualmente
  mais curto, porém muito mais código (PaymentIntents, confirmação, tratamento
  de erro) e maior superfície de teste.

O prazo de desenvolvimento é curto (estimativa de 2–3 semanas para todo o
projeto).

## Decisão

Usar **Stripe Checkout hospedado (redirect)** como único caminho de pagamento.
O frontend chama o backend para criar a Checkout Session e apenas redireciona
para a URL retornada.

## Consequências

- Apple Pay / Google Pay / PIX / cartão saem prontos, sem código adicional.
- Superfície de PCI e de teste de frontend drasticamente menor — compatível com
  o prazo curto.
- O doador vê a tela hospedada da Stripe (perda de controle visual/branding do
  checkout). Aceitável: a fricção do redirect é mínima e some quando há carteira
  digital ativa.
- O Payment Request Button / Stripe Elements descritos no PRD ficam fora do
  escopo. Reverter para Elements no futuro exigiria reescrever todo o frontend
  de pagamento.
