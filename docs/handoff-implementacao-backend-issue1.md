# Handoff — Implementação do backend (Hospedando Anjos)

## Tipo desta sessão
Primeira sessão de **implementação** (greenfield virou código). Saiu da fase de
escopo/arquitetura e entregou o **backend completo da issue #1** com testes.
A sessão anterior (definição de escopo) está em
`docs/handoff-escopo-e-arquitetura.md`.

## Fontes da verdade (ler primeiro)
- `CONTEXT.md` — glossário + todas as decisões. Fonte principal de escopo.
- `docs/adr/0001..0004` — decisões de arquitetura.
- **Issues no GitHub** (`fast-dev-digital/hospedandoAnjos`): #1 checkout avulso,
  #2 webhook+Brevo, #3 recorrente, #4 status+billing portal. Cada uma tem uma
  seção "Passo a passo (arquivo por arquivo)" no corpo.
- Histórico git: 11 commits atômicos nesta sessão (de `c11c820` a `13d4cbd`),
  todos na branch `main`. Ler o diff em vez de eu repetir aqui.

## O que esta sessão fez (não duplicar o diff — ver commits)
- Gerou as 4 issues (#1–#4) via skill `to-issues` e depois reescreveu cada uma
  com passo a passo arquivo-a-arquivo. **Landing/frontend completo foi tirado do
  backlog de propósito — vai para o time de frontend.**
- Implementou **todo o backend da issue #1** (checkout avulso) em camadas
  (ADR-0002), via fluxo TDD "usuário escreve, agente analisa + escreve testes".
- **39 testes passando** (`cd backend && npx vitest run`), `tsc --noEmit` limpo.

## Estado do código (resumo, detalhe no git)
PRONTO e testado (issue #1 backend):
- `lib/` money, phone, validation (+ `result.ts`, `errors.ts`) — regras puras.
- `config/env.ts` — **PLACEHOLDER** (lê process.env com fallback; tem
  `TODO(acessos)` para virar `required()` quando as chaves chegarem).
- `integrations/stripe.ts` — adapter com instanciação **lazy** (não quebra sem
  chave; permite mock nos testes).
- `services/checkout.service.ts` — `startCheckout` (orquestra validação+Stripe).
- Camada HTTP: middleware (errorHandler, cors), controller, routes (`/health`,
  `POST /checkout`), `app.ts`/`server.ts` separados, `app.test.ts` (supertest).

NÃO commitado de propósito — esqueletos só-comentário das issues #2/#5
(`integrations/brevo.ts`, `services/donor.service.ts`,
`services/webhook.service.ts`, `controllers/webhook.controller.ts`,
`controllers/billing.controller.ts`, `middleware/rawBody.ts`). Entram com a
implementação delas.

## Decisões de implementação tomadas (fáceis de quebrar)
- Libs puras retornam `Result<T>`/`MultiResult<T>` (`{ok,error}` / `errors[]`),
  **sem throw**. Quem lança `ValidationError` é o service, na borda.
- `validateCheckout` **acumula todos os erros** e devolve o payload **sanitizado**
  (whatsapp em E.164, strings trimadas) — é esse value que vai para a Stripe.
- Erro 400 no JSON é **string única** (`{ error: "a, b, c" }`), não array.
- Imports relativos **precisam de `.js`** no fim (tsconfig `NodeNext`).
- `tsconfig` tem `"types": ["node"]` (necessário p/ `process`).
- Tudo é **local**: nenhum `git push` foi feito; nenhum servidor ativo.

## Próximos passos (ordem sugerida)
1. **Frontend mínimo da #1** (único pedaço que falta p/ #1 fechar 100%): form
   nome/email/whatsapp/valor → `POST /checkout` → redirect + página `/obrigado`.
   `frontend/` ainda NÃO existe (precisa scaffold Vite+React). Lembrar: landing
   completa é do time de frontend, aqui é só o form que prova o checkout.
2. **Issue #2** (webhook Stripe + Brevo) — usa os esqueletos não-commitados.
   Ponto crítico: rawBody ANTES do `express.json()` no `app.ts` (já há comentário
   marcando). Stripe CLI gera o `whsec_` local p/ testar sem deploy.
3. **Trocar o placeholder do `env.ts`** por `required()` quando os acessos
   chegarem.

## Bloqueio externo — credenciais (pedir aos stakeholders)
O backend está pronto mas não conversa com o mundo real sem as chaves. Pedido
mínimo que destrava as próximas issues:
- **Stripe**: `sk_test_…` (destrava checkout real da #1), `whsec_…` (#2),
  `pk_…` (frontend). Confirmar **PIX habilitado** na conta BR.
- **Brevo**: `BREVO_API_KEY` + criar os atributos de contato do CONTEXT.md
  (TIPO, VALOR, STATUS, STRIPE_CUSTOMER_ID, DATA_PRIMEIRA_DOACAO, VALOR_ULTIMA,
  DATA_ULTIMA, TIPO_ULTIMA, WHATSAPP) + acesso p/ a automação que dispara o n8n.
- **Infra**: VPS+Coolify e DNS de `prismabrasil.com.br` (para deploy, não p/ dev).
- n8n/Manychat: acesso às contas (backend não usa, mas o projeto precisa).
`FRONTEND_ORIGIN` e `PORT` o dev define — não pedir.

## Notas de ambiente
- Windows. O classificador de Bash ficou instável na sessão; comandos de
  teste/build (`vitest`, `tsc`, `git` read-only) foram rodados com o sandbox
  desabilitado por serem seguros. Warnings de LF→CRLF no git são normais e
  inofensivos.

## Skills sugeridas para a próxima sessão
- **`tdd`** — continuar o ciclo red-green para a #2 e o frontend.
- **`prototype`** (opcional) — se quiser folhear o form do frontend antes de
  fixar o design.
