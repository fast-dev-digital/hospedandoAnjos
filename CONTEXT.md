# Contexto — Hospedando Anjos

Plataforma de doação recorrente do Grupo Prisma Brasil. Substitui arrecadações
sazonais por receita recorrente previsível. Frontend próprio (não WordPress) +
backend Node.js/TypeScript, integrados a **Asaas** (gateway de pagamento), Brevo,
n8n e Manychat.

> **Gateway: Asaas** (não mais Stripe). A migração e todas as decisões de design
> dela estão no [ADR-0005](docs/adr/0005-migracao-stripe-para-asaas.md). Motivo: a
> Stripe não disponibilizava PIX na doação avulsa. Os ADRs 0001/0003 (Stripe)
> ficam como histórico. **O código backend ainda é Stripe** — a reescrita para
> Asaas será feita em issues próprias; este documento descreve o destino (Asaas).

## Glossário

- **Doador**: pessoa que faz uma doação. Identificado por nome, e-mail, WhatsApp e
  **CPF** (este exigido pelo Asaas — ver "cadastro invisível"). Não possui senha
  nem cadastro prévio ("cadastro invisível").
- **Doação**: contribuição financeira. Pode ser **recorrente** (mensal, Asaas
  `subscription`) ou **avulsa** (única, Asaas `payment`/cobrança). Valores validados
  no backend — nunca confiar no valor cru do browser:
  - **Avulsa**: mínimo **R$ 1,00** (100 centavos); sem teto definido.
  - **Recorrente**: mínimo **R$ 20,00** (2000 centavos) — bate com a menor âncora
    de preço e cobre a taxa do gateway com folga; sem teto definido.

  **Sem segmentação por projeto** — `project_target` foi removido do payload, dos
  metadados e do processamento do webhook.
- **WhatsApp**: campo obrigatório, **global em formato E.164 com código de país
  obrigatório** (ex.: `+5511...`, `+1...`, `+351...`). Sem default `+55`. O
  backend valida/normaliza antes de gravar no Brevo; se não normalizar para E.164
  válido, rejeita o checkout. Crítico porque o Manychat depende do número.
- **Cadastro invisível**: o doador não cria conta/senha. Diferença vs. Stripe: o
  Asaas **exige um `customer` criado antes da cobrança**, e esse customer **exige
  CPF** (`cpfCnpj` obrigatório). O backend cria/reusa o cliente buscando por
  e-mail no Asaas (`GET /customers?email=`) antes de cobrar — se existe, reusa o
  ID; se não, cria. Mantém o stateless (Asaas é a fonte da verdade do doador) e o
  "sem senha" para o doador. O CPF entra no formulário (1 campo a mais que a
  Stripe não pedia); bônus: destrava o recibo fiscal futuro.
- **Backend**: aplicação Node.js/TypeScript responsável por: pagamentos (Asaas),
  webhooks, cancelamento de doações e cadastro do doador no Brevo. Não fala com
  Manychat.
- **Divisão de canais** (regra firme): **Brevo = e-mail** (recibo, lembrete,
  transacional — é a especialidade dele e o preço é por volume de envio).
  **Manychat = todo o WhatsApp/Instagram/Messenger** (agradecimento, lembrete,
  retenção — um único número/ferramenta para WhatsApp, evita conflito de webhook
  da Meta entre dois sistemas). **n8n orquestra os dois.** Configuração fina fica
  para o desenvolvimento.
- **Brevo**: CRM centralizador onde o doador é cadastrado **exclusivamente pelo
  webhook `PAYMENT_CONFIRMED`** — nunca pela página de retorno (`successUrl`). A
  volta do doador (`successUrl` → `/obrigado`) é só uma tela de "Obrigado!" sem
  efeito colateral, pois o doador pode fechar a aba ou o pagamento (ex.: PIX) pode
  não ter compensado ainda no retorno.
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
| `VALOR` | valor da assinatura mensal, **em reais** (ex.: `20` / `20.00`) — gravado pronto p/ exibir no recibo (`{{VALOR}}`), não em centavos |
| `STATUS` (ativo / falha_pagamento / inativo) | reflete a **assinatura recorrente** |
| `ASAAS_SUBSCRIPTION_ID` (`sub_xxx`) | qual assinatura cancelar (o link de cancelamento assina este ID). O customer NÃO é gravado — é reachável pelo e-mail no Asaas |
| `DATA_PRIMEIRA_DOACAO` | recibo / relatório futuro |
| `LINK_CANCELAMENTO` | link assinado p/ cancelar a assinatura; o e-mail só insere `{{LINK_CANCELAMENTO}}` (backend gera, ver abaixo) |

**Grupo "última doação" — qualquer doação (recorrente ou avulsa) atualiza:**

| Atributo | Função |
|---|---|
| `VALOR_ULTIMA` | valor da doação mais recente, **em reais** (mesmo formato de `VALOR`) |
| `DATA_ULTIMA` | data da doação mais recente — **gatilho do n8n** |
| `TIPO_ULTIMA` (recorrente / avulsa) | tipo da doação mais recente |

Sempre presentes: `EMAIL`, `NOME`, `WHATSAPP_NUM` (E.164). ⚠️ `WHATSAPP` é
atributo **reservado** do Brevo — gravá-lo via `attributes` ao **criar** um contato
novo retorna `404 document_not_found` (quebra todo 1º pagamento de doador novo). Por
isso o número vai no atributo **custom `WHATSAPP_NUM`** (type text). A automação do
n8n/Manychat deve ler `WHATSAPP_NUM`, não `WHATSAPP`.

**Regra de upsert no webhook `PAYMENT_CONFIRMED`** (o backend distingue o tipo pelo
campo `subscription` do evento: preenchido = recorrente; `null` = avulsa):
- Doação **recorrente** → atualiza grupo mantenedora (`TIPO=recorrente`,
  `STATUS=ativo`, `VALOR`, `ASAAS_SUBSCRIPTION_ID`, `LINK_CANCELAMENTO`...) **e**
  grupo última doação.
- Doação **avulsa** → atualiza **só** o grupo última doação. Se o contato não
  existe, cria com `TIPO=avulsa`; se já existe como recorrente, **não rebaixa**.

Nome/telefone/CPF do doador são lidos via `GET /customers/{id}` no webhook (o
cliente no Asaas é a fonte da verdade — substitui o `metadata` que a Stripe
carregava no evento).

**STATUS** (grupo mantenedora) — transições por webhook:
- `PAYMENT_CONFIRMED` (recorrente) → `STATUS = ativo`
- `PAYMENT_OVERDUE` → `STATUS = falha_pagamento`
- `SUBSCRIPTION_DELETED` → `STATUS = inativo`

**Gatilho do n8n para o agradecimento: campo `DATA_ULTIMA` mudou.** Toda doação
(primeira ou repetida, recorrente ou avulsa) atualiza esse campo e dispara o
agradecimento. A de-dupe de webhook duplicado fica por conta do n8n.

**Recibo mensal (renovação recorrente):** no Asaas, a primeira mensalidade e cada
renovação geram o **mesmo** evento `PAYMENT_CONFIRMED` (cada cobrança é única). Não
há a separação `checkout.session.completed` vs `invoice.payment_succeeded` da
Stripe — então **todo `PAYMENT_CONFIRMED` dispara um e-mail** (agradecimento na 1ª,
recibo nas seguintes), sem distinção. Cada confirmação atualiza `DATA_ULTIMA` → o
e-mail sai. Não há risco de duplicação porque cada cobrança confirmada é um
pagamento real distinto.

**Link de cancelamento:** o backend gera, no cadastro recorrente, um link assinado
(HMAC, sem validade — vale enquanto a assinatura existir) e grava em
`LINK_CANCELAMENTO` no Brevo. O e-mail só insere `{{LINK_CANCELAMENTO}}`. O link
aponta para a API (`{API_BASE_URL}/cancelar?t=<token>`); o token assina o
`subscription_id`. Ao ser clicado, a API valida o token e chama
`DELETE /subscriptions/{id}` no Asaas (cancela em **1 clique**, sem tela de
confirmação — risco de clique acidental aceito em favor da simplicidade). Segredo
`BILLING_LINK_SECRET` (gerar com `openssl rand -hex 32`) e `API_BASE_URL` vivem no
env, nunca no repo.

**Checklist de configuração do Brevo (tela, não código):**
1. Criar TODOS os atributos de contato listados acima (incluindo
   `ASAAS_SUBSCRIPTION_ID` e `LINK_CANCELAMENTO`). Atributo que não existe na conta
   é **ignorado silenciosamente** no upsert — pegadinha real já observada em teste.
2. Automação nativa do Brevo com gatilho **`DATA_ULTIMA` mudou** → envia o e-mail
   (recibo + `{{LINK_CANCELAMENTO}}`). Dispara na 1ª doação e nas renovações.
3. n8n: WhatsApp/Manychat no mesmo gatilho (com de-dupe própria).

## Idempotência (backend stateless)

O backend **não tem banco próprio**: fonte de verdade das doações = Asaas,
dos doadores = Brevo (e os dados cadastrais do doador = cliente no Asaas). O Asaas
entrega webhooks **at-least-once** (eventos duplicados são esperados; o Asaas
recomenda de-dupe pelo `id` único do evento, mas dispensável aqui — ver abaixo).
Sem tabela de `processed_events`, a idempotência é obtida por etapas naturalmente
idempotentes:

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
  webhooks duplicados são incomuns e o custo de um recibo repetido é baixo.
  Resolver "direito" exigiria estado no backend (reabre ADR stateless),
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
2. **Carteiras digitais / mais métodos**. Como a página de pagamento é hospedada
   pelo Asaas, novos métodos habilitados na conta aparecem sem mudança estrutural
   no backend.
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
  - Asaas: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` (token que o Asaas envia no
    header `asaas-access-token`; você define ao cadastrar o webhook),
    `ASAAS_BASE_URL` (sandbox vs produção). Confirmar **PIX habilitado** na conta.
  - Brevo: `BREVO_API_KEY` (+ liberar o IP do servidor em
    app.brevo.com/security/authorised_ips, ou desativar a restrição em dev).
  - Backend define: `BILLING_LINK_SECRET` (gerar com `openssl rand -hex 32`),
    `API_BASE_URL`, `FRONTEND_ORIGIN`, `PORT`.
- **Configurar Brevo** — criar TODOS os atributos de contato (incl.
  `ASAAS_SUBSCRIPTION_ID` e `LINK_CANCELAMENTO`); montar a automação de e-mail
  (gatilho `DATA_ULTIMA`, recibo + `{{LINK_CANCELAMENTO}}`). Ver "Checklist de
  configuração do Brevo".
- **Configurar Asaas** — cadastrar o webhook apontando para `…/webhooks/asaas`,
  com o `ASAAS_WEBHOOK_TOKEN` definido, escutando os eventos `PAYMENT_CONFIRMED`,
  `PAYMENT_OVERDUE`, `SUBSCRIPTION_DELETED`. Sandbox tem ambiente de teste próprio.
- **Workflow no n8n** — escutar o Brevo (gatilho de contato) e disparar o
  Manychat (WhatsApp), com de-dupe própria. Acesso às contas n8n/Manychat.
- **Frontend** — o time de frontend precisa commitar o form/landing (hoje
  ausente no repo) que chama `POST /checkout` e abre a `invoiceUrl` do Asaas.
  Adicionar o **campo CPF** ao formulário (exigido pelo Asaas).

> Ordem prática: credenciais no `.env` → cadastrar webhook no Asaas → atributos +
> automação no Brevo → testar checkout avulso (PIX/cartão) → recorrente →
> cancelamento → renovação. n8n/Manychat por último (não bloqueiam o backend).

## Pendências (a decidir)

- **Teto de valor** (avulsa e recorrente): a fechar com stakeholders. Mínimos já
  definidos (avulsa R$1, recorrente R$20).
- **Conteúdo da landing** (textos das seções, perguntas do FAQ): durante o
  desenvolvimento.
- **Relatórios**: fora do escopo agora. Visão de negócio sai do painel do Asaas +
  Brevo. Painel próprio reabriria a decisão de backend stateless (ADR futuro).
- **Recibo** (formato a definir durante o desenvolvimento): vai existir (agradecimento + recibo via Manychat), mas formato e
  origem dos dados ainda indefinidos. Implicação a resolver depois: o backend
  precisa gravar no contato do Brevo, no ato do cadastro, dados suficientes
  (valor, tipo, projeto, data) para o n8n montar o recibo — já que o n8n só
  enxerga o Brevo.

## Infraestrutura

- **Tudo numa VPS própria com Coolify** (PaaS self-hosted). Sem Railway, sem host
  estático externo.
- **Backend** → app Node no Coolify, em **subdomínio da Fast** (ex.: `api.fast…`).
  Env vars (`ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `BREVO_API_KEY`,
  `BILLING_LINK_SECRET`) nas settings do Coolify, nunca no repo.
- **Frontend** → build estático Vite, servido pelo Coolify, no **domínio do
  cliente** (`prismabrasil.com.br`). Variável pública: URL da API. (Com Asaas o
  pagamento é em página hospedada via redirect, então o front não precisa de chave
  pública de gateway.)
- **Domínios separados (cliente × Fast)** → **CORS obrigatório**: o backend libera
  só a origem `https://prismabrasil.com.br`. Frontend referencia a API por
  variável de ambiente (se a URL mudar, só reconfigurar).
- **HTTPS via Let's Encrypt** (Coolify) — obrigatório: o webhook do Asaas exige
  HTTPS.
- **Webhook** do Asaas aponta para `https://api.fast…/webhooks/asaas`.
- Segredos (`ASAAS_API_KEY`, `BREVO_API_KEY`, `BILLING_LINK_SECRET`) **nunca** no
  frontend — só no backend.

## Métodos de pagamento (Asaas)

| Tipo | Cartão | PIX | Boleto |
|---|---|---|---|
| Avulsa | ✅ | ✅ | ❌ |
| Recorrente | ✅ | ❌ (por ora) | ❌ |

Os métodos são **especificados por tipo** ao criar a cobrança/assinatura (não se
usa `billingType: UNDEFINED`, que mostraria boleto também). Sem boleto (fricção
alta, ruim p/ doação por impulso). PIX recorrente (PIX Automático) fica fora por
ora — pode exigir habilitação própria na conta; liga-se depois se desejado. O PIX
na avulsa foi o motivo da migração (a Stripe não o oferecia ali).

## Organização do código

- **Monorepo**: `frontend/` + `backend/` neste diretório.
- **Frontend**: React + Vite + TypeScript. **Landing page de campanha** de
  página única (+ página `/obrigado`), com três objetivos: explicar o programa
  Hospedando Anjos, converter (bloco de doação) e responder objeções (FAQ). O
  bloco de doação é **tela única** (âncoras + valor livre + toggle + formulário,
  um botão "Doar") — meta de fricção zero / checkout < 20s. Âncoras e valor livre
  são o **mesmo valor**: clicar numa âncora preenche o campo; doador pode
  sobrescrever. Campos do form: nome, e-mail, WhatsApp (E.164) e **CPF** (exigido
  pelo Asaas). Build estático.

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
  │   ├── checkout.service.ts   # cria/reusa cliente, cria cobrança, decide métodos
  │   ├── donor.service.ts      # upsert no Brevo (2 grupos de campos)
  │   └── webhook.service.ts    # roteia os eventos do Asaas
  ├── integrations/    # adapters: APIs externas isoladas (asaas, brevo)
  ├── lib/             # lógica PURA, testável (money, phone E.164, validation,
  │                    #   billing-token p/ o link de cancelamento)
  ├── middleware/      # error handler, CORS, validação (sem rawBody — Asaas não
  │                    #   usa assinatura HMAC; valida por token no header)
  ├── config/          # env vars, segredos
  └── app.ts / server.ts
  ```

  Regra de dependência: cada camada só conhece a de baixo; `lib/` não depende de
  nada externo; `integrations/` isola as APIs (gateway muda → 1 arquivo: foi
  `stripe.ts`, vira `asaas.ts`). Login futuro entra como `integrations/db` +
  camada auth sem tocar Asaas/Brevo.
- Tipo do contrato de checkout compartilhado entre os dois lados (evita
  divergência de payload).

## Responsabilidades do backend (escopo fechado)

1. Conexão com Asaas — **cria/reusa o cliente** (busca por e-mail; cria com nome,
   e-mail, telefone e CPF se novo) e então **cria a cobrança** (avulsa) ou a
   **assinatura** (recorrente, ciclo mensal). Recebe a `invoiceUrl` (página de
   pagamento hospedada) e a devolve ao frontend, que redireciona. Métodos
   especificados por tipo: avulsa = PIX + cartão; recorrente = cartão.
   `callback.successUrl` = `{FRONTEND_ORIGIN}/obrigado`.
2. Webhooks — receber em `/webhooks/asaas` e validar pelo token no header
   `asaas-access-token` (comparação simples com `ASAAS_WEBHOOK_TOKEN`; sem raw
   body — o Asaas não usa assinatura HMAC). Tratar os eventos; qualquer outro
   responde `200` e é ignorado:
   - `PAYMENT_CONFIRMED` → cadastra/atualiza o doador no Brevo (upsert por e-mail)
     com os dados da doação. Distingue recorrente (campo `subscription` preenchido)
     de avulsa (`null`). Lê nome/telefone/CPF via `GET /customers/{id}`. Vale para
     a 1ª doação E para cada renovação (cada uma é um `PAYMENT_CONFIRMED`). O
     `PAYMENT_RECEIVED` subsequente da mesma cobrança é ignorado (não duplicar).
   - `PAYMENT_OVERDUE` → marca `STATUS=falha_pagamento` no Brevo. A régua de
     recuperação (e-mail/WhatsApp) fica no n8n, não no backend.
   - `SUBSCRIPTION_DELETED` → marca o doador como "Inativo" no Brevo (cobre
     cancelamento de qualquer origem: nosso link, painel Asaas, inadimplência).
3. Cancelamento de doações — link assinado no e-mail (`/cancelar?t=<token>`, token
   assina o `subscription_id`). Ao clicar, o backend valida e chama
   `DELETE /subscriptions/{id}` no Asaas (1 clique, sem confirmação). O endpoint só
   executa o cancelamento; quem marca "Inativo" no Brevo é o webhook
   `SUBSCRIPTION_DELETED` (item 2). Retenção via WhatsApp/Manychat está FORA do
   escopo por enquanto.
4. Cadastro no Brevo — registrar quem doou.
