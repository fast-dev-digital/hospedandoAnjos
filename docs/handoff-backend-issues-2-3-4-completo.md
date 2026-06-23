# Handoff — Backend das issues #2, #3 e #4 completo (Hospedando Anjos)

## Tipo desta sessão
Continuação da implementação. A sessão anterior (issue #1) está em
`docs/handoff-implementacao-backend-issue1.md`. Esta entregou o **backend das
issues #2, #3 e #4** (+ uma 5ª funcionalidade: recibo mensal de renovação),
todo via TDD, e fechou as pontas de design do ciclo recorrente.

## Fontes da verdade (ler primeiro)
- `CONTEXT.md` — atualizado nesta sessão. Ver especialmente: atributo
  `LINK_CANCELAMENTO`, "Recibo mensal", "Link de cancelamento", "Checklist de
  configuração do Brevo", a nota de de-dupe na seção Idempotência, e a nova
  seção **"Pré-requisitos para testar o projeto de ponta a ponta"**.
- `docs/adr/0001..0004` — decisões de arquitetura (inalteradas).
- Issues `fast-dev-digital/hospedandoAnjos` #2, #3, #4 — **continuam OPEN** de
  propósito (ver "Estado das issues" abaixo).
- Commits desta sessão (ler o diff, não duplicar aqui): `3bae1fe`, `78baf7b`,
  `46e4dd7`, `1dcddeb`, `b0e232e`, `137a12d`, `6431289`. Todos em `main`, local
  (nenhum `git push` feito).

## Estado das issues (importante — distinção repo vs. GitHub)
O **backend** das #1–#4 está implementado e testado (**74 testes**, `tsc`
limpo). Mas **nenhuma issue fecha 100%** porque os critérios de verificação
real não foram exercidos. As issues seguem **abertas no GitHub** por isso.

Falta em comum para fechar qualquer uma: (a) **frontend** commitado pelo time
(hoje ausente — `frontend/` só tem `referencias/` com mockups); (b) **teste real
com credenciais** (Stripe CLI + Brevo). Detalhe por issue:
- **#2** webhook+Brevo (avulsa): backend pronto. Falta verificação real.
- **#3** recorrente: backend já vinha pronto das #1/#2 (ramificação por `type`);
  esta sessão só **cobriu com testes** (`stripe.test.ts` + casos no `app.test.ts`).
  Falta o toggle no frontend + verificação real.
- **#4** status+cancelamento: implementado esta sessão (ver abaixo). A "forma de
  identificar o customer" foi **decidida e documentada** (token assinado).

## O que esta sessão fez (resumo — detalhe nos commits/CONTEXT.md)
1. **Conversão reais→centavos** (`46e4dd7`): `reaisToCents` em `lib/money.ts`
   (usa `Math.round` p/ float), ligado no `validateCheckout`. **DECISÃO:** o
   campo do contrato continua chamado `amountInCents` mas o **front envia REAIS**
   nele; o backend converte. Nome é enganoso de propósito (escolha do usuário) —
   **avisar o time de frontend: manda 20, não 2000.**
2. **Token de cancelamento** (`1dcddeb`): `lib/billing-token.ts` HMAC-SHA256,
   **sem validade** (link vale enquanto a pessoa for doadora; determinístico p/
   um mesmo `cus_xxx` enquanto `BILLING_LINK_SECRET` não mudar).
3. **`GET /billing-portal`** (`b0e232e`): valida token → redirect 302 p/ portal
   Stripe. **DECISÃO:** GET+redirect (não POST+JSON da issue), porque clicar em
   link de e-mail é GET.
4. **Recibo mensal + link no Brevo** (`137a12d`): case
   `invoice.payment_succeeded` tratando **só** `billing_reason=subscription_cycle`
   (1ª fatura ignorada p/ não duplicar o recibo do mês 1);
   `registerRecurringRenewal` atualiza só "última doação"; `registerDonation`
   grava `LINK_CANCELAMENTO` no Brevo (forma B: backend gera, Brevo só insere).

## Decisões de design fechadas nesta sessão (fáceis de quebrar sem saber)
- **Identificação do customer no portal = token assinado (forma B).** Backend
  grava `LINK_CANCELAMENTO` no contato Brevo; o e-mail só insere a variável.
  Descartadas: por e-mail puro e customerId cru (ambos vulneráveis a IDOR).
- **Canais:** Brevo nativo dispara o **e-mail** (recibo + link); n8n dispara o
  **WhatsApp** (Manychat). Gatilho de ambos: `DATA_ULTIMA` mudou.
- **De-dupe do e-mail (Opção C):** aceitar duplicação **rara** (webhook
  duplicado da Stripe). Backend é stateless; resolver "direito" reabriria ADR.
  Só é recibo informativo. Registrado no CONTEXT.md (seção Idempotência).
- **4 eventos de webhook** agora (era 3): +`invoice.payment_succeeded`.

## Bloqueio externo — pré-requisitos para testar de verdade
Ver a seção completa **"Pré-requisitos para testar o projeto de ponta a ponta"**
no `CONTEXT.md`. Resumo: credenciais Stripe/Brevo no `.env`; gerar
`BILLING_LINK_SECRET` (`openssl rand -hex 32`) e `API_BASE_URL`; criar os
atributos no Brevo (⚠️ atributo inexistente é **ignorado em silêncio** no upsert
— inclui o novo `LINK_CANCELAMENTO`); automação de e-mail no Brevo; workflow no
n8n; frontend do time.

## Pergunta aberta deixada para esta resposta (não-código)
O usuário pediu, ao finalizar, uma explicação sobre **enviar WhatsApp via n8n +
Manychat e qual número/ferramenta usar** — isto será respondido na mensagem
final ao usuário, não é tarefa de código. Se o próximo agente for **implementar**
o workflow do n8n, isso é trabalho de configuração de plataforma (fora do
backend), guiado pelo ADR-0004 e pelo CONTEXT.md.

## Próximos passos sugeridos (ordem)
1. **Credenciais + config** (usuário já vai fazer): destrava todo o teste real.
2. **Verificação ponta-a-ponta** com Stripe CLI — skill `verify` ajuda.
3. **Frontend** (time) — toggle avulsa/recorrente, `POST /checkout` (lembrar:
   valor em reais), redirect; página `/obrigado`.
4. **Fechar as issues** no GitHub após verificação real passar.
5. **n8n/Manychat** — workflow de WhatsApp (último, não bloqueia backend).

## Notas de ambiente
- Windows. Comandos de teste/build (`vitest`, `tsc`, `git` read-only) rodados
  com sandbox desabilitado por serem seguros. Warnings LF→CRLF são normais.
- Para commit message multilinha no shell deste ambiente, usar heredoc
  (`git commit -F - <<'EOF'`) — o here-string com `@'...'@` prefixou `@` no
  título numa tentativa anterior.

## Skills sugeridas para a próxima sessão
- **`verify`** — validar o fluxo real (checkout → webhook → Brevo → cancelamento)
  quando as credenciais chegarem.
- **`tdd`** — se surgir ajuste no backend ou o 5º evento virar issue formal.
- **`triage`/`to-issues`** — se quiser formalizar "recibo mensal" como issue #5
  (foi implementado mas não tinha issue própria).
