export const WHATSAPP_NUMBER = '5538984052418'

/** Link do WhatsApp do suporte com a mensagem já escrita. */
export function whatsappLink(mensagem: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensagem)}`
}

export const MSG_CONHECER =
  'Olá! Tenho uma autoescola e quero conhecer o AmaralPro. Pode me mostrar como funciona?'
export const MSG_PERSONALIZADO =
  'Olá! Quero montar um plano personalizado do AmaralPro para a minha autoescola. Podemos conversar sobre o que eu preciso?'
export const MSG_INSTRUTOR =
  'Olá! Sou instrutor autônomo e quero organizar minha agenda e meus alunos com o AmaralPro. Como funciona para mim?'

export const WHATSAPP_URL = whatsappLink(MSG_CONHECER)
