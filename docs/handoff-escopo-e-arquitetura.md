# Handoff — Estruturação de escopo e decisão de arquitetura

> **Tipo deste handoff:** documento de transição da fase de **definição de escopo
> e arquitetura** (sessão de grilling/design) para a fase de **implementação**.
> Não contém código — captura as decisões tomadas e aponta as fontes da verdade.

## O que esta sessão fez

Sessão de `/grill-with-docs` sobre o projeto **Hospedando Anjos** (plataforma de
doação recorrente do Grupo Prisma Brasil). Partiu do PRD e divergiu dele em
vários pontos. Todas as decisões foram capturadas em documentos — **não há código
escrito ainda** (greenfield).

## Fontes da verdade (ler primeiro)

- `CONTEXT.md` — glossário + todas as decisões de design e pendências. É a fonte
  principal de escopo.
- `docs/adr/0001-stripe-checkout-hospedado.md`
- `docs/adr/0002-arquitetura-backend-camadas-com-adapters.md`
- `docs/adr/0003-metodos-de-pagamento-cartao-e-pix.md`
- `docs/adr/0004-mensageria-brevo-n8n-manychat-desde-o-inicio.md`
- PRD original: `escopo_total_hospedando_anjos.pdf` (NOTA: desatualizado em vários
  pontos — o `CONTEXT.md`/ADRs prevalecem onde divergem). Ignorar o outro PDF
  `Fast Workspace — Documentação Funcional.pdf` (é de outro projeto, foi anexado
  por engano).

## Divergências importantes do PRD (não regredir para o PRD)

- **Não é WordPress** — frontend próprio (React+Vite+TS).
- **Não é "microserviço isolado"** — é o backend da aplicação (monorepo).
- **Sem Apple/Google Pay** — só cartão e PIX (ver ADR-0003).
- **`project_target` removido** — sem segmentação por projeto.
- **Backend stateless, sem banco** — Stripe e Brevo são as fontes da verdade.
- **Arquitetura do backend: camadas com adapters** (Layered + Hexagonal leve),
  NÃO MVC — ver ADR-0002 e a árvore de pastas no `CONTEXT.md`. `integrations/`
  isola SDKs; `lib/` é puro/testável; login futuro = `integrations/db` + auth.
- **n8n escuta o Brevo** (não é chamado pelo backend); Manychat só via n8n.
- **Retenção via WhatsApp fora do escopo**; cancelamento só via Billing Portal.
- **Mensageria: Brevo + n8n + Manychat completo desde o início** (ADR-0004 —
  motivado pelos futuros de retenção e lembrete agendado; "só Brevo" descartado).
- **Divisão de canais**: Brevo = e-mail; Manychat = todo WhatsApp/Instagram/
  Messenger; n8n orquestra. Configuração fina no desenvolvimento.

## Futuros planejados (fora do escopo agora — a estrutura já os acomoda)

Ver seção "Futuros planejados" no `CONTEXT.md`. Resumo: (1) login do doador →
reabre decisão de banco, postura é manter stateless agora; (2) Apple/Google Pay →
trivial no Checkout hospedado; (3) canal de retenção → Manychat; (4) lembrete de
~4 dias antes da cobrança recorrente → cron do n8n. Itens (3) e (4) são o motivo
de montar Brevo+n8n+Manychat desde já. **Não simplificar de um jeito que feche
essas portas.**

## Pendências conscientes (não bloqueiam o início)

- Teto de valores (avulsa e recorrente) — a decidir com stakeholders. Mínimos já
  fechados: avulsa R$1, recorrente R$20.
- Formato do recibo — durante o desenvolvimento (Brevo já guarda dados
  suficientes; ver esquema de atributos no CONTEXT.md).
- Conteúdo da landing (textos, FAQ) — durante o desenvolvimento.
- Relatórios — fora do escopo agora (reabre decisão de backend stateless se
  voltar).

## Pontos de atenção que viraram decisão (fáceis de quebrar na implementação)

- Idempotência: Stripe envia webhooks at-least-once. Backend stateless → upsert
  por e-mail no Brevo + **de-dupe no n8n** (gatilho `DATA_ULTIMA`). Ver CONTEXT.md.
- Cadastro no Brevo **só no webhook** `checkout.session.completed`, nunca na
  `success_url`.
- Modelo de contato Brevo = "pessoa", com dois grupos de campos (mantenedora ×
  última doação) — avulsa NÃO rebaixa um mantenedor recorrente.
- PIX não funciona em `mode: subscription` — recorrente é só cartão.

## Próximo passo pretendido pelo usuário

Gerar issues de implementação. O usuário quer fazer isso (possivelmente em outra
sessão). Recomendação dada: a skill **`to-issues`** deve se basear em `CONTEXT.md`
+ `docs/adr/` como escopo (eles foram desenhados para isso). Fatiar em slices
verticais (ex.: checkout avulso ponta-a-ponta; webhook + cadastro Brevo;
recorrente; cancelamento via Billing Portal; landing).

## Skills sugeridas para a próxima sessão

- **`to-issues`** — para fatiar o escopo em issues (apontar para CONTEXT.md + ADRs).
- (Depois) scaffold do monorepo `frontend/` + `backend/` conforme ADR-0002.
