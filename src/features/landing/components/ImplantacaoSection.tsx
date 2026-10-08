import { Revelar } from './Revelar'

const PASSOS = [
  {
    titulo: 'Conversa no WhatsApp',
    texto: 'Entendemos como a sua autoescola funciona hoje e qual plano faz sentido.',
  },
  {
    titulo: 'Configuração',
    texto: 'Cadastramos instrutores, categorias, horários, bloqueios e as suas regras de remarcação.',
  },
  {
    titulo: 'Alunos e treinamento',
    texto: 'Importamos a sua planilha de alunos e créditos e mostramos o painel para a sua equipe.',
  },
  {
    titulo: 'Link no ar',
    texto: 'Você manda o link para os alunos e eles já começam a marcar aula pelo celular.',
  },
]

export function ImplantacaoSection() {
  return (
    <section className="bg-white py-24 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Revelar className="max-w-2xl">
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.025em] text-slate-900 leading-[1.05]">
            Do primeiro contato ao link no ar em até 48 horas.
          </h2>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed">
            A gente configura tudo junto com você e treina a sua equipe antes de liberar o link para os alunos.
          </p>
        </Revelar>

        <div className="mt-14 relative">
          {/* Pista ligando os passos */}
          <div
            aria-hidden
            className="hidden lg:block absolute left-6 right-6 top-6 h-[3px]"
            style={{ backgroundImage: 'linear-gradient(90deg, #FACC15 0 18px, transparent 18px 32px)', backgroundSize: '32px 3px' }}
          />
        <ol className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className="relative">
              <Revelar delay={i * 0.08}>
                <span className="relative z-10 w-12 h-12 rounded-2xl bg-asfalto text-white font-display text-lg font-bold flex items-center justify-center ring-8 ring-white">
                  {i + 1}
                </span>
                <h3 className="mt-5 font-display text-xl font-bold text-slate-900">{p.titulo}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{p.texto}</p>
              </Revelar>
            </li>
          ))}
        </ol>
        </div>
      </div>
    </section>
  )
}
