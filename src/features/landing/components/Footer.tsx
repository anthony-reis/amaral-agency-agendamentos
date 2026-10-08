import Link from 'next/link'
import { Instagram, MessageCircle } from 'lucide-react'
import { WHATSAPP_URL, MSG_PERSONALIZADO, whatsappLink } from '../constants'

const colunas = [
  {
    titulo: 'Produto',
    links: [
      { label: 'O sistema', href: '#sistema' },
      { label: 'Apps', href: '#apps' },
      { label: 'Planos', href: '#planos' },
      { label: 'Dúvidas', href: '#duvidas' },
    ],
  },
  {
    titulo: 'Entrar',
    links: [
      { label: 'Sou aluno', href: '/entrar?perfil=aluno' },
      { label: 'Sou autoescola', href: '/entrar?perfil=escola' },
    ],
  },
  {
    titulo: 'Suporte',
    links: [
      { label: 'WhatsApp', href: WHATSAPP_URL },
      { label: 'Plano personalizado', href: whatsappLink(MSG_PERSONALIZADO) },
    ],
  },
]

export function Footer() {
  return (
    <footer className="bg-asfalto text-white/55 border-t border-white/5 pb-24 md:pb-0">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="" className="w-8 h-8 object-cover rounded-xl" />
              <span className="font-display font-bold text-lg text-white tracking-tight">AmaralPro</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed max-w-xs">
              Sistema de gestão para autoescolas e instrutores autônomos: agenda, alunos, instrutores, vendas e financeiro
              no mesmo lugar.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <a
                href="https://www.instagram.com/amaralagencyrp/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {colunas.map((c) => (
            <div key={c.titulo}>
              <h4 className="text-sm font-semibold text-white mb-4">{c.titulo}</h4>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-12 pt-8 border-t border-white/5 text-xs">
          © {new Date().getFullYear()} AmaralPro. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}
