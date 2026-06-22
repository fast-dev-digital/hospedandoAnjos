# 4. Mensageria: Brevo + n8n + Manychat completo desde o início

Data: 2026-06-17

## Status

Aceito

## Contexto

O escopo imediato precisa apenas de **agradecimento automático** após o
pagamento (paga → cadastra no CRM → mensagem de WhatsApp). Para esse uso isolado,
o **Brevo sozinho** bastaria: ele é BSP oficial da Meta, tem automação visual com
gatilho e ação "enviar WhatsApp", e suporta parâmetros transacionais para o
recibo personalizado — eliminando n8n e Manychat (1 peça em vez de 3).

Porém foram identificados futuros planejados (fora do escopo imediato, mas
prováveis) que o Brevo sozinho atende mal:

- **Canal de retenção**: fluxo conversacional com ramificação ("aceita baixar
  para R$20?") — capacidade do Manychat, não do Brevo.
- **Lembrete de cobrança recorrente** (~4 dias antes): precisa de agendamento por
  tempo (cron) — capacidade do n8n, não do backend stateless nem natural no
  Brevo.

Apple Pay/Google Pay e login não influenciam esta decisão (o primeiro é trivial
no Checkout hospedado; o segundo é tratado pela postura stateless + ADR-0002).

## Decisão

Montar **Brevo + n8n + Manychat** desde o início:

- **Brevo**: CRM. Backend cadastra o doador (upsert).
- **n8n**: orquestrador. Escuta o Brevo (gatilho `DATA_ULTIMA`) e dispara o
  Manychat. É também onde futuramente moram o cron do lembrete e a ponte para a
  retenção.
- **Manychat**: canal de WhatsApp (e Instagram/Messenger). Envia agradecimento +
  recibo; futuramente conduz fluxos conversacionais de retenção.

O backend permanece igual nos dois cenários — só fala com o Brevo.

## Consequências

- Os futuros "retenção" e "lembrete de 4 dias" já têm onde morar, sem retrabalho
  estrutural nem mudança no backend.
- Custo hoje: operar 3 plataformas (3 contas, 3 integrações, 3 pontos de falha)
  mesmo usando apenas o agradecimento — assumido conscientemente em favor da
  flexibilidade futura.
- O caminho "só Brevo" (mais simples hoje) foi descartado por fechar as portas de
  (retenção, lembrete). Se esses futuros forem cancelados, reabrir esta decisão e
  considerar colapsar para "só Brevo".
- Não adotar o n8n/Manychat agora exigiria reintroduzi-los e migrar a lógica de
  envio depois — mais caro que já deixá-los no lugar.
