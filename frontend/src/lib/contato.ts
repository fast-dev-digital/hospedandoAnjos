// =============================================================================
// lib/contato.ts — canais oficiais de contato/suporte da Prisma Brasil.
// Fonte única: usado no FAQ, rodapé e mensagens de erro. Para trocar um canal,
// altere SÓ aqui.
// =============================================================================

export const CONTATO = {
  email: 'contato@prismabrasil.com.br',
  instagram: '@prismabrasil',
  instagramUrl: 'https://instagram.com/prismabrasil',
  // WhatsApp oficial. Formato wa.me: só dígitos com DDI+DDD.
  whatsappNumero: '5519983149844',
  whatsappLabel: '(19) 98314-9844',
} as const;

export const CONTATO_EMAIL_HREF = `mailto:${CONTATO.email}`;
export const CONTATO_WHATSAPP_HREF = `https://wa.me/${CONTATO.whatsappNumero}`;
