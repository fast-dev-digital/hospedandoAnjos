# Contexto — Hospedando Anjos

Plataforma de doação recorrente do Grupo Prisma Brasil. Substitui arrecadações
sazonais por receita recorrente previsível. Frontend próprio (não WordPress) +
backend Node.js/TypeScript, integrados a Stripe, Brevo, n8n e Manychat.

## Glossário

- **Doador**: pessoa que faz uma doação. Identificado por nome, e-mail e WhatsApp.
  Não possui senha nem cadastro prévio ("cadastro invisível").
- **Doação**: contribuição financeira. Pode ser **recorrente** (mensal, Stripe
  `subscription`) ou **avulsa** (única, Stripe `payment`). Valores validados no
  backend — nunca confiar no valor cru do browser:
  - **Avulsa**: mínimo **R$ 1,00** (100 centavos); sem teto definido.
  - **Recorrente**: mínimo **R$ 20,00** (2000 centavos) — bate com a menor âncora
    de preço e cobre a taxa da Stripe (~3,99% + R$0,39) com folga; sem teto
    definido.

  **Sem segmentação por projeto** — `project_target` foi removido do payload, do
  metadata e do processamento do webhook.
- **WhatsApp**: campo obrigatório, **global em formato E.164 com código de país
  obrigatório** (ex.: `+5511...`, `+1...`, `+351...`). Sem default `+55`. O
  backend valida/normaliza antes de gravar no Brevo; se não normalizar para E.164
  válido, rejeita o checkout. Crítico porque o Manychat depende do número.
- **Cadastro invisível**: criação do doador como Customer no Stripe sem que ele
  crie conta/senha. Stripe cria/anexa o Customer pelo e-mail automaticamente.
- **Backend**: aplicação Node.js/TypeScript responsável por: pagamentos (Stripe),
  webhooks, cancelamento de doações e cadastro do doador no Brevo. Não fala com
  Manychat.
- **Divisão de canais** (regra firme): **Brevo = e-mail** (recibo, lembrete,
  transacional — é a especialidade dele e o preço é por volume de envio).
  **Manychat = todo o WhatsApp/Instagram/Messenger** (agradecimento, lembrete,
  retenção — um único número/ferramenta para WhatsApp, evita conflito de webhook
  da Meta entre dois sistemas). **n8n orquestra os dois.** Configuração fina fica
  para o desenvolvimento.
- **Brevo**: CRM centralizador onde o doador é cadastrado **exclusivamente pelo
  webhook `checkout.session.completed`** — nunca pela `success_url`. A volta do
  doador (`success_url`) é só uma tela de "Obrigado!" sem efeito colateral, pois
  o doador pode fechar a aba ou o pagamento (ex.: PIX) pode não ter compensado
  ainda no retorno.
- **n8n**: orquestrador visual. **Escuta o Brevo** (gatilho de automação ao
  entrar contato) e dispara o Manychat. Toda a régua de mensagens vive aqui.
  O backend não conhece o n8n — desacoplamento total.
- **Manychat**: canal de envio das mensagens de agradecimento + recibo (WhatsApp).
  Acionado pelo n8n, nunca diretamente pelo backend.

## Atributos do contato no Brevo

Upsert por `EMAIL` (uma linha por pessoa). O contato representa **a pessoa**, não
a última doação. Por isso os campos se dividem em **dois grupos** (decisão B):

**Grupo "mantenedora" — só uma doação RECORRENTE altera (avulsa nunca rebaixa):**

| Atributo | Função |
|---|---|
| `TIPO` (= `recorrente`) | marca o vínculo de mantenedor; avulsa não sobrescreve |
| `VALOR` | valor da assinatura mensal |
| `STATUS` (ativo / falha_pagamento / inativo) | reflete a **assinatura recorrente** |
| `STRIPE_CUSTOMER_ID` (`cus_xxx`) | reencontrar doador em eventos futuros |
| `DATA_PRIMEIRA_DOACAO` | recibo / relatório futuro |
| `LINK_CANCELAMENTO` | link assinado p/ o Billing Portal; o e-mail só insere `{{LINK_CANCELAMENTO}}` (backend gera, ver abaixo) |

**Grupo "última doação" — qualquer doação (recorrente ou avulsa) atualiza:**

| Atributo | Função |
|---|---|
| `VALOR_ULTIMA` | valor da doação mais recente |
| `DATA_ULTIMA` | data da doação mais recente — **gatilho do n8n** |
| `TIPO_ULTIMA` (recorrente / avulsa) | tipo da doação mais recente |

Sempre presentes: `EMAIL`, `NOME`, `WHATSAPP` (E.164).

**Regra de upsert no webhook `checkout.session.completed`:**
- Doação **recorrente** → atualiza grupo mantenedora (`TIPO=recorrente`,
  `STATUS=ativo`, `VALOR`...) **e** grupo última doação.
- Doação **avulsa** → atualiza **só** o grupo última doação. Se o contato não
  existe, cria com `TIPO=avulsa`; se já existe como recorrente, **não rebaixa**.

**STATUS** (grupo mantenedora) — transições por webhook:
- `checkout.session.completed` (recorrente) → `STATUS = ativo`
- `invoice.payment_failed` → `STATUS = falha_pagamento`
- `customer.subscription.deleted` → `STATUS = inativo`

**Gatilho do n8n para o agradecimento: campo `DATA_ULTIMA` mudou.** Toda doação
(primeira ou repetida, recorrente ou avulsa) atualiza esse campo e dispara o
agradecimento. A de-dupe de webhook duplicado fica por conta do n8n.

**Recibo mensal (renovação recorrente):** a Stripe cobra a assinatura todo mês e
emite `invoice.payment_succeeded`. O backend trata **só** as renovações
(`billing_reason = subscription_cycle`) — a primeira fatura
(`subscription_create`) é ignorada aqui porque já é coberta pelo
`checkout.session.completed` (senão o recibo do mês 1 sairia duplicado). A
renovação atualiza **só o grupo última doação** (`VALOR_ULTIMA`, `DATA_ULTIMA`,
`TIPO_ULTIMA=recorrente`) → o gatilho `DATA_ULTIMA` dispara o e-mail mensal.

**Link de cancelamento (Billing Portal):** o backend gera, no cadastro recorrente,
um link assinado (HMAC, sem validade — vale enquanto a pessoa for doadora) e grava
em `LINK_CANCELAMENTO` no Brevo. O e-mail só insere `{{LINK_CANCELAMENTO}}`. O link
aponta para a API (`{API_BASE_URL}/billing-portal?t=<token>`); ao ser clicado, a
API valida o token e **redireciona (302)** direto para o portal da Stripe. Segredo
`BILLING_LINK_SECRET` (gerar com `openssl rand -hex 32`) e `API_BASE_URL` vivem no
env, nunca no repo.

**Checklist de configuração do Brevo (tela, não código):**
1. Criar TODOS os atributos de contato listados acima (incluindo `LINK_CANCELAMENTO`).
   Atributo que não existe na conta é **ignorado silenciosamente** no upsert.
2. Automação nativa do Brevo com gatilho **`DATA_ULTIMA` mudou** → envia o e-mail
   (recibo + `{{LINK_CANCELAMENTO}}`). Dispara na 1ª doação e nas renovações.
3. n8n: WhatsApp/Manychat no mesmo gatilho (com de-dupe própria).

## Idempotência (backend stateless)

O backend **não tem banco próprio**: fonte de verdade das doações = Stripe,
dos doadores = Brevo. A Stripe entrega webhooks **at-least-once** (eventos
duplicados são esperados). Sem tabela de `processed_events`, a idempotência é
obtida por etapas naturalmente idempotentes:

- **Cadastro no Brevo**: upsert por e-mail — reprocessar o mesmo doador não
  duplica o contato. ✅
- **Agradecimento (Manychat via n8n)**: ⚠️ risco de envio duplicado. O backend
  stateless não controla isso. O gatilho do n8n é "`DATA_ULTIMA` mudou" (ver
  esquema do Brevo) — um webhook duplicado faria o upsert gravar a mesma
  `DATA_ULTIMA` de novo e poderia re-disparar. Mitigação: **o n8n de-duplica
  antes de chamar o Manychat** (ex.: ignorar se já agradeceu por aquela
  doação/data). **Obrigatório validar isso na configuração das plataformas.**
- **E-mail de recibo (Brevo nativo)**: ⚠️ mesmo risco do agradecimento. Decisão
  de canais: **Brevo nativo dispara o e-mail** (recibo + `{{LINK_CANCELAMENTO}}`),
  **n8n dispara o WhatsApp** (Manychat). A de-dupe do WhatsApp fica no n8n; a do
  e-mail **não** é controlada pelo backend (stateless). **Postura adotada**: para
  recibo (e-mail informativo, não cobrança), aceitar uma duplicação **rara** —
  webhooks duplicados da Stripe são incomuns e o custo de um recibo repetido é
  baixo. Resolver "direito" exigiria estado no backend (reabre ADR stateless),
  desproporcional. Reavaliar (mover o e-mail para o n8n) só se a duplicação
  incomodar na prática.

## Futuros planejados (fora do escopo agora, mas a estrutura já os acomoda)

A estrutura atual foi escolhida para deixar estes itens baratos de adicionar
depois. **Não simplificar de um jeito que feche estas portas** (ex.: remover o
n8n/Manychat ou fundir o backend ao Brevo).

1. **Login do doador** (ver histórico / gerenciar). Hoje é "cadastro invisível",
   sem conta. Reabre a decisão de **backend stateless**. Postura: **manter
   stateless agora**; quando o login vier, adicionar banco como `integrations/db`
   + camada auth (adição localizada, garantida pelo ADR-0002). Não provisionar
   banco por precaução — é o futuro menos definido.
2. **Apple Pay / Google Pay**. Já pré-pronto: como o Checkout é hospedado
   (ADR-0001), basta adicionar aos `payment_method_types`. Sem mudança de
   estrutura.
3. **Canal de retenção** (WhatsApp conversacional: "aceita baixar para R$20?").
   É fluxo conversacional com ramificação — papel do **Manychat**, que o Brevo
   sozinho não faz. Por isso o n8n + Manychat ficam no desenho desde já.
4. **Lembrete de cobrança recorrente** (avisar ~4 dias antes via e-mail/WhatsApp).
   Precisa de **agendamento por tempo (cron)** — papel do **n8n** (trigger de
   cron), não do backend stateless.

> Por causa de (3) e (4), a decisão foi montar **Brevo + n8n + Manychat completo
> desde o início**, em vez do caminho "só Brevo" (que é mais simples hoje, mas
> atende mal retenção e lembrete agendado).

## Pré-requisitos para testar o projeto de ponta a ponta (bloqueio atual)

O backend está implementado e testado (unit/integração com mocks), mas **não
conversa com o mundo real** até estes acessos serem obtidos e configurados:

- **Credenciais (env, nunca no repo)** — pegar e colocar no `.env`/Coolify:
  - Stripe: `STRIPE_SECRET_KEY` (`sk_test_…`), `STRIPE_WEBHOOK_SECRET` (`whsec_…`,
    via Stripe CLI no dev), publishable `pk_…` (frontend). Confirmar **PIX
    habilitado** na conta BR.
  - Brevo: `BREVO_API_KEY`.
  - Backend define: `BILLING_LINK_SECRET` (gerar com `openssl rand -hex 32`),
    `API_BASE_URL`, `FRONTEND_ORIGIN`, `PORT`.
- **Configurar Brevo** — criar TODOS os atributos de contato (incl.
  `LINK_CANCELAMENTO`); montar a automação de e-mail (gatilho `DATA_ULTIMA`,
  recibo + `{{LINK_CANCELAMENTO}}`). Ver "Checklist de configuração do Brevo".
- **Configurar Stripe** — apontar o webhook para `…/webhooks/stripe`; no dev,
  `stripe listen --forward-to localhost:3000/webhooks/stripe` gera o `whsec_`.
- **Workflow no n8n** — escutar o Brevo (gatilho de contato) e disparar o
  Manychat (WhatsApp), com de-dupe própria. Acesso às contas n8n/Manychat.
- **Frontend** — o time de frontend precisa commitar o form/landing (hoje
  ausente no repo) que chama `POST /checkout` e abre o link da Stripe.

> Ordem prática: credenciais no `.env` → Stripe CLI p/ `whsec_` → atributos +
> automação no Brevo → testar checkout avulso → recorrente → cancelamento →
> renovação. n8n/Manychat por último (não bloqueiam o backend).

## Pendências (a decidir)

- **Teto de valor** (avulsa e recorrente): a fechar com stakeholders. Mínimos já
  definidos (avulsa R$1, recorrente R$20).
- **Conteúdo da landing** (textos das seções, perguntas do FAQ): durante o
  desenvolvimento.
- **Relatórios**: fora do escopo agora. Visão de negócio sai do Dashboard da
  Stripe + Brevo. Painel próprio reabriria a decisão de backend stateless (ADR
  futuro). `price_data` inline cria um Price único por doação — relatório "por
  preço" na Stripe fica inútil, mas relatório de receita/MRR nativo funciona.
- **Recibo** (formato a definir durante o desenvolvimento): vai existir (agradecimento + recibo via Manychat), mas formato e
  origem dos dados ainda indefinidos. Implicação a resolver depois: o backend
  precisa gravar no contato do Brevo, no ato do cadastro, dados suficientes
  (valor, tipo, projeto, data) para o n8n montar o recibo — já que o n8n só
  enxerga o Brevo.

## Infraestrutura

- **Tudo numa VPS própria com Coolify** (PaaS self-hosted). Sem Railway, sem host
  estático externo.
- **Backend** → app Node no Coolify, em **subdomínio da Fast** (ex.: `api.fast…`).
  Env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BREVO_API_KEY`) nas
  settings do Coolify, nunca no repo.
- **Frontend** → build estático Vite, servido pelo Coolify, no **domínio do
  cliente** (`prismabrasil.com.br`). Variáveis públicas: URL da API e
  publishable key da Stripe (`pk_…`).
- **Domínios separados (cliente × Fast)** → **CORS obrigatório**: o backend libera
  só a origem `https://prismabrasil.com.br`. Frontend referencia a API por
  variável de ambiente (se a URL mudar, só reconfigurar).
- **HTTPS via Let's Encrypt** (Coolify) — obrigatório: webhook da Stripe exige
  HTTPS.
- **Webhook** da Stripe aponta para `https://api.fast…/webhooks/stripe`.
- Segredos `sk_…` e `BREVO_API_KEY` **nunca** no frontend — só no backend.

## Métodos de pagamento (Stripe Checkout)

| Tipo | Cartão | PIX | Carteiras (Apple/Google Pay) |
|---|---|---|---|
| Avulsa (`mode: payment`) | ✅ | ✅ | ❌ |
| Recorrente (`mode: subscription`) | ✅ | ❌ (Stripe não suporta PIX recorrente) | ❌ |

`payment_method_types` condicionado ao tipo: recorrente → `['card']`; avulsa →
cartão + PIX. Sem Apple/Google Pay (decisão de simplificar). Como usamos Checkout
hospedado, **nenhuma verificação de domínio da Apple é necessária**.

## Organização do código

- **Monorepo**: `frontend/` + `backend/` neste diretório.
- **Frontend**: React + Vite + TypeScript. **Landing page de campanha** de
  página única (+ página `/obrigado`), com três objetivos: explicar o programa
  Hospedando Anjos, converter (bloco de doação) e responder objeções (FAQ). O
  bloco de doação é **tela única** (âncoras + valor livre + toggle + formulário,
  um botão "Doar") — meta de fricção zero / checkout < 20s. Âncoras e valor livre
  são o **mesmo valor**: clicar numa âncora preenche o campo; doador pode
  sobrescrever. Build estático.

  Estrutura de seções (página única, rolagem vertical, mobile-first):
  1. Hero — título + CTA "Quero ser um anjo" (rola até o bloco de doação).
  2. O que é o programa — explicação, problema, impacto (storytelling primeiro).
  3. Bloco de doação — âncoras, valor, toggle, formulário, botão "Doar".
  4. Como funciona / transparência — recorrência, cancelamento fácil, segurança.
  5. FAQ — perguntas e respostas, dissolve objeções.
  6. Rodapé — institucional, contato.

  O CTA do hero leva quem já decidiu direto ao bloco de doação, sem precisar ler
  tudo — atende os dois públicos sem wizard.
- **Backend**: Node.js + TypeScript + Express. Arquitetura em **camadas com
  adapters** (Layered + Hexagonal leve) — ver ADR-0002. NÃO é MVC (backend
  stateless não tem camada Model/banco):

  ```
  backend/src/
  ├── routes/          # liga URL ao controller
  ├── controllers/     # finos: extrai req, chama service, responde
  ├── services/        # orquestração da regra de negócio
  │   ├── checkout.service.ts   # monta price_data, decide mode + métodos
  │   ├── donor.service.ts      # upsert no Brevo (2 grupos de campos)
  │   └── webhook.service.ts    # roteia os 3 eventos
  ├── integrations/    # adapters: SDKs externos isolados (stripe, brevo)
  ├── lib/             # lógica PURA, testável (money, phone E.164, validation)
  ├── middleware/      # rawBody p/ webhook, error handler, CORS, validação
  ├── config/          # env vars, segredos
  └── app.ts / server.ts
  ```

  Regra de dependência: cada camada só conhece a de baixo; `lib/` não depende de
  nada externo; `integrations/` isola os SDKs (Stripe muda → 1 arquivo). Login
  futuro entra como `integrations/db` + camada auth sem tocar Stripe/Brevo.
- Tipo do contrato de checkout compartilhado entre os dois lados (evita
  divergência de payload).

## Responsabilidades do backend (escopo fechado)

1. Conexão com Stripe — criação de **Checkout Session hospedada** (redirect).
   Modo `subscription` (recorrente) ou `payment` (avulsa). Stripe cuida de
   cartão, Apple Pay, Google Pay e PIX. Frontend só redireciona para a URL.
   Valor sempre **inline via `price_data`** (sem Products/Prices pré-criados):
   o doador escolhe qualquer valor. Recorrente acrescenta
   `recurring: { interval: 'month' }` e um `product_data.name` genérico
   ("Doação Hospedando Anjos"); a Stripe cria os Prices sob demanda.
2. Webhooks — receber e validar (assinatura `stripe-signature` + raw body) e
   tratar **4 eventos**; qualquer outro responde `200` e é ignorado:
   - `checkout.session.completed` → cadastra/atualiza o doador no Brevo (upsert
     por e-mail) com os dados da doação.
   - `invoice.payment_succeeded` (só `billing_reason=subscription_cycle`) →
     atualiza o grupo última doação (recibo mensal da renovação). A primeira
     fatura é ignorada (já coberta pelo `checkout.session.completed`).
   - `customer.subscription.deleted` → marca o doador como "Inativo" no Brevo.
   - `invoice.payment_failed` → marca status de falha/recuperação no Brevo. A
     régua de recuperação (e-mail/WhatsApp) fica no n8n, não no backend.
3. Cancelamento de doações — **só Billing Portal da Stripe**. Backend gera a
   sessão do portal (`stripe.billingPortal.sessions.create`); link mágico vai no
   rodapé do e-mail. Doador cancela sozinho na tela da Stripe. Backend reage ao
   webhook `customer.subscription.deleted` marcando o doador como "Inativo" no
   Brevo. Retenção via WhatsApp/Manychat está FORA do escopo por enquanto.
4. Cadastro no Brevo — registrar quem doou.
