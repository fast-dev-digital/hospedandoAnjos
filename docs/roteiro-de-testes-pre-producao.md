# Roteiro de testes — antes de virar a chave do Asaas para PRODUÇÃO

Data: 2026-06-29

Objetivo: validar o fluxo inteiro (checkout → Asaas → webhook → Brevo → e-mail +
WhatsApp/n8n → cancelamento) **em sandbox** antes de trocar a `ASAAS_API_KEY` por
produção. Marque cada caso como ✅/❌. Os casos críticos estão com 🔴.

> Ambiente: PRODUÇÃO apontando para Asaas **sandbox**. Site:
> `https://anjos.prismabrasil.com.br`. Use e-mails de teste reais (que você consiga
> abrir) para conferir o recibo. Lembre: o e-mail do recibo demora **3-5 min**
> (latência normal da automação do Brevo) — não é bug.

---

## Grupo 1 — Validações do formulário (frontend, instantâneo)

| # | Caso | Como testar | Esperado |
|---|---|---|---|
| 1.1 🔴 | Avulsa abaixo do mínimo | Avulsa, valor R$ 3,00 | Bloqueia com "Valor mínimo para doação avulsa: R$ 5,00". NÃO vai pro Asaas. |
| 1.2 | Avulsa no mínimo exato | Avulsa, R$ 5,00 | Aceita, vai pro checkout do Asaas. |
| 1.3 🔴 | Recorrente abaixo do mínimo | Recorrente, R$ 10,00 | Bloqueia com "mínimo R$ 20,00". |
| 1.4 | Recorrente no mínimo | Recorrente, R$ 20,00 | Aceita. |
| 1.5 | CPF inválido | Qualquer doação, CPF `111.111.111-11` | Bloqueia (dígito verificador). |
| 1.6 | CPF válido | CPF real/gerado válido | Aceita. |
| 1.7 | Telefone sem DDI | WhatsApp `11999998888` (sem +55) | Bloqueia ("informe o código de país") OU o componente força +55. |
| 1.8 | Campos vazios | Deixar nome/email/cpf vazios | Bloqueia, não envia. |

---

## Grupo 2 — Doação AVULSA (caminho feliz) 🔴

| # | Passo | Esperado |
|---|---|---|
| 2.1 | Avulsa R$ 5+, dados válidos, PIX | Redireciona pra página Asaas; **PIX e cartão** aparecem; **boleto NÃO**. |
| 2.2 | Pagar com PIX no sandbox | Pagamento confirma; redireciona pra `/obrigado`. |
| 2.3 | Pagar com cartão sandbox | Idem 2.2. |
| 2.4 🔴 | Conferir Brevo (após ~1 min) | Contato criado/atualizado: `VALOR_ULTIMA`=valor, `TIPO_ULTIMA`=avulsa, `DATA_ULTIMA` recente, `WHATSAPP_NUM`=**+55...** (com 55!), `NOME`. |
| 2.5 🔴 | Conferir e-mail (3-5 min) | Recibo chega; mostra valor; Tipo=Avulsa; SEM bloco/link de cancelamento. |
| 2.6 🔴 | Conferir WhatsApp (via n8n) | Template `recibo_doacao_recorrente` chega no número. (Hoje só nº de teste; com nº de prod, chega a qualquer um.) |
| 2.7 | Conferir n8n Executions | Workflow rodou sem erro; `subscriber_id` preenchido; sendFlow `success`. |

---

## Grupo 3 — Doação RECORRENTE (mantenedor) 🔴

| # | Passo | Esperado |
|---|---|---|
| 3.1 | Recorrente R$ 20+, cartão | Redireciona pra Asaas; **só cartão** (recorrente não tem PIX). |
| 3.2 | Pagar a 1ª cobrança | Confirma; vai pra `/obrigado`. |
| 3.3 🔴 | Conferir Brevo | Grupo mantenedora completo: `TIPO`=recorrente, `STATUS`=ativo, `VALOR`, `ASAAS_SUBSCRIPTION_ID`, `LINK_CANCELAMENTO`, `DATA_PRIMEIRA_DOACAO`. |
| 3.4 🔴 | Conferir e-mail | Recibo chega; Tipo=Mensal; **COM** bloco de mantenedor + link de cancelamento. |
| 3.5 | Conferir WhatsApp | Template chega. |

---

## Grupo 4 — Renovação mensal (reenvio do recibo) 🔴

> Comprova que toda renovação redispara o recibo (não só a 1ª).

| # | Passo | Esperado |
|---|---|---|
| 4.1 | Com a assinatura do Grupo 3 ativa, no painel Asaas sandbox **antecipar o vencimento** da próxima cobrança (ou pagar a 2ª cobrança gerada) | Asaas dispara novo `PAYMENT_CONFIRMED` com `subscription` preenchido. |
| 4.2 🔴 | Conferir Brevo | `DATA_ULTIMA` e `VALOR_ULTIMA` **atualizam de novo**. |
| 4.3 🔴 | Conferir e-mail | **Segundo** recibo chega (prova o reenvio). |

---

## Grupo 5 — Cancelamento 🔴

| # | Passo | Esperado |
|---|---|---|
| 5.1 | No e-mail recorrente, clicar em "cancelar minha doação" (LINK_CANCELAMENTO) | Abre `/cancelar`, mostra "Cancelamento confirmado". |
| 5.2 🔴 | Conferir Asaas | Assinatura fica `INACTIVE`/deletada; 0 assinaturas ativas. |
| 5.3 🔴 | Conferir Brevo | `STATUS` vira **inativo** (via `SUBSCRIPTION_DELETED`). |
| 5.4 | Cancelar direto no painel Asaas (sem usar o link) | Mesmo resultado: `STATUS=inativo` no Brevo. |
| 5.5 | Link de cancelamento inválido | `/cancelar?t=lixo` → "Link inválido ou expirado". |

---

## Grupo 6 — Transições de status

| # | Passo | Esperado |
|---|---|---|
| 6.1 | Simular pagamento vencido (`PAYMENT_OVERDUE`) — no sandbox, deixar uma cobrança vencer, ou simular o webhook | Brevo: `STATUS`=falha_pagamento. |
| 6.2 | Doador recorrente faz uma avulsa extra | NÃO rebaixa: mantenedora intacta (`TIPO`=recorrente), só atualiza última doação (`TIPO_ULTIMA`=avulsa). |

---

## Grupo 7 — Casos de erro / borda

| # | Passo | Esperado |
|---|---|---|
| 7.1 | Webhook com token errado | 401; nada no Brevo. |
| 7.2 | Doação com e-mail que já existe no Brevo | Atualiza (upsert), NÃO duplica contato. |
| 7.3 🔴 | Forçar erro e ver no Sentry | Erro 500 aparece como Issue no Sentry (já validado). |
| 7.4 | Telefone com DDD diferente (ex.: 11, 21) | Brevo grava `+55` + DDD correto; n8n monta certo. |
| 7.5 | Mesmo doador, 2 doações seguidas | 2 recibos (re-entrada na automação Brevo permitida). |

---

## Grupo 8 — Antes de virar a chave de PRODUÇÃO (checklist final) 🔴

- [ ] Gerar `ASAAS_API_KEY` de **produção** (`aact_prod_...`); colocar em **base64**
      na env `ASAAS_API_KEY_B64` do Coolify (bug do `$`). `ASAAS_BASE_URL=https://api.asaas.com/v3`.
- [ ] **Recadastrar o webhook** no painel de PRODUÇÃO do Asaas → URL
      `https://api-anjos.fastdevdigital.com.br/webhooks/asaas`, mesmo `authToken`,
      eventos `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_DELETED`.
- [ ] Na conta de produção do Asaas: **desabilitar o boleto**; confirmar **PIX habilitado**.
- [ ] **Rotacionar segredos** expostos no chat: `ASAAS_WEBHOOK_TOKEN`, `BREVO_API_KEY`,
      `BILLING_LINK_SECRET`, e a **Manychat API Key** (estão no n8n e no chat desta sessão).
- [ ] Conferir `SENTRY_DSN` setado no Coolify (monitoramento ligado).
- [ ] `FRONTEND_ORIGIN` e `API_BASE_URL` corretos (domínios de prod, sem barra final).
- [ ] **Número WhatsApp de produção** verificado na Meta (hoje é nº de teste — só
      entrega pra números cadastrados como teste).
- [ ] **Limpar contatos/leads de teste** no Brevo e subscribers de teste no Manychat.
- [ ] Fazer **1 doação real de baixo valor** em produção (PIX) e validar o fluxo todo
      ponta a ponta com dinheiro de verdade antes de divulgar.

---

## Como simular um webhook sem pagar (atalho de dev)

Para reproduzir um evento sem ir ao Asaas (ex.: testar renovação/erro). Use o
`ASAAS_WEBHOOK_TOKEN` real e IDs que existam no sandbox:

```bash
curl -X POST https://api-anjos.fastdevdigital.com.br/webhooks/asaas \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: <TOKEN>" \
  -d '{"event":"PAYMENT_CONFIRMED","payment":{"customer":"cus_REAL","value":20,"subscription":"sub_REAL"}}'
```
- `subscription` preenchido = recorrente; `null` = avulsa.
- `customer` precisa existir no Asaas (o webhook faz `getCustomer`).
