import Link from 'next/link'
import { Car, Instagram, Linkedin, MessageCircle } from 'lucide-react'

const footerLinks = {
  Produto: [
    { label: 'Recursos', href: '#recursos' },
    { label: 'Planos', href: '#planos' },
    { label: 'Como funciona', href: '#como-funciona' },
  ],
  Suporte: [
    { label: 'Ajuda', href: '#' },
    { label: 'WhatsApp', href: '#' },
    { label: 'Contato', href: '#contato' },
  ],
  Legal: [
    { label: 'Termos de Uso', href: '#' },
    { label: 'Privacidade', href: '#' },
  ],
}

export function Footer() {
  return (
    <footer id="contato" className="bg-slate-900 text-slate-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 rounded-lg bg-brand-teal flex items-center justify-center">
                <Car className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">
                Amaral<span className="text-brand-teal">Pro</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              Sistema completo de gestão para autoescolas. Automatize, organize e cresça.
            </p>

            {/* Social */}
            <div className="flex items-center gap-3 mt-5">
              {[
                { Icon: Instagram, href: '#' },
                { Icon: MessageCircle, href: '#' },
                { Icon: Linkedin, href: '#' },
              ].map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-brand-teal hover:text-white transition-colors"
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs font-semibold text-white uppercase tracking-widest mb-4">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} AmaralPro. Todos os direitos reservados.</p>
          <p>Feito com ❤️ para autoescolas brasileiras</p>
        </div>
      </div>
    </footer>
  )
}
