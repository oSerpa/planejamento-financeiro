import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, Lock, Mail, PiggyBank, Plane, ShieldCheck, Smartphone, Tags, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Icone } from '../components/Icone'

type Modo = 'entrar' | 'criar'

export function Entrar() {
  const [modo, setModo] = useState<Modo>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setEnviando(true)
    setErro(null)
    setAviso(null)
    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) setErro(traduzir(error.message))
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome: nome.trim() }, emailRedirectTo: window.location.origin },
      })
      if (error) setErro(traduzir(error.message))
      else if (!data.session) setAviso('Conta criada. Abra o link que chegou no seu e-mail para confirmar e depois entre.')
    }
    setEnviando(false)
  }

  function trocar(m: Modo) {
    setModo(m)
    setErro(null)
    setAviso(null)
  }

  return (
    <div className="entrar">
      <aside className="entrar__vitrine" aria-hidden>
        <div className="marca marca--clara">
          <span className="marca__selo">c</span>
          <span className="marca__nome">caixinha</span>
        </div>

        <div className="vitrine__texto">
          <p className="entrar__frase">
            Saiba para onde vai <em>cada real</em>, sem planilha.
          </p>
          <ul className="vitrine__pontos">
            <li>
              <Tags size={16} /> Entradas e saídas por categoria
            </li>
            <li>
              <PiggyBank size={16} /> Metas com quanto guardar por mês
            </li>
            <li>
              <Smartphone size={16} /> No celular e no computador
            </li>
          </ul>
        </div>

        <div className="vitrine__cena">
          <div className="vitrine__saldo">
            <span className="vitrine__rotulo">Sobrou em novembro</span>
            <span className="vitrine__valor">
              <small>R$</small>1.284<small>,50</small>
            </span>
            <span className="vitrine__dica">
              Dá para gastar <b>R$ 160,56</b> por dia
            </span>
            <span className="vitrine__barra">
              <i style={{ flexGrow: 45, background: '#C2553A' }} />
              <i style={{ flexGrow: 20, background: '#D08A2E' }} />
              <i style={{ flexGrow: 12, background: '#5A6BB0' }} />
              <i style={{ flexGrow: 8, background: '#8C5A9E' }} />
              <i style={{ flexGrow: 30 }} className="vitrine__sobra" />
            </span>
          </div>
          <ul className="vitrine__lista">
            {[
              ['#D08A2E', 'cart', 'Mercado da semana', '156,30'],
              ['#4E6E8E', 'bus', 'Bilhete único', '120,00'],
              ['#8C5A9E', 'ticket', 'Cinema', '58,00'],
            ].map(([cor, icone, nome, valor]) => (
              <li key={nome}>
                <span style={{ color: cor, background: `${cor}2a` }}>
                  <Icone nome={icone} size={15} />
                </span>
                {nome}
                <b>− R$ {valor}</b>
              </li>
            ))}
          </ul>
          <div className="vitrine__meta">
            <span className="vitrine__meta-icone">
              <Plane size={15} />
            </span>
            <span>
              Viagem de formatura
              <i>
                <i style={{ width: '62%' }} />
              </i>
            </span>
            <b>62%</b>
          </div>
        </div>
      </aside>
      <form className="entrar__cartao entra" onSubmit={enviar}>
        <div className="marca entrar__marca-celular">
          <span className="marca__selo">c</span>
          <span className="marca__nome">caixinha</span>
        </div>
        <h1 className="entrar__titulo">{modo === 'entrar' ? 'Bom te ver de novo' : 'Vamos começar'}</h1>
        <p className="entrar__sub">
          {modo === 'entrar' ? 'Entre para ver suas contas do mês.' : 'Crie sua conta com e-mail e senha.'}
        </p>

        {modo === 'criar' && (
          <label className="campo">
            <span className="campo__rotulo">Como quer ser chamado</span>
            <span className="campo__caixa">
              <User size={17} />
              <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="given-name" />
            </span>
          </label>
        )}
        <label className="campo">
          <span className="campo__rotulo">E-mail</span>
          <span className="campo__caixa">
            <Mail size={17} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="voce@email.com"
            />
          </span>
        </label>
        <label className="campo">
          <span className="campo__rotulo">Senha</span>
          <span className="campo__caixa">
            <Lock size={17} />
            <input
              type={verSenha ? 'text' : 'password'}
              placeholder="Mínimo de 6 caracteres"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              className="campo__olho"
              onClick={() => setVerSenha((v) => !v)}
              aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}
            >
              {verSenha ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>

        {erro && <p className="alerta alerta--erro">{erro}</p>}
        {aviso && <p className="alerta">{aviso}</p>}

        <button className="btn btn--primario btn--largo" disabled={enviando}>
          {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          {!enviando && <ArrowRight size={18} />}
        </button>

        <p className="entrar__troca">
          {modo === 'entrar' ? (
            <>
              Ainda não tem conta?{' '}
              <button type="button" className="link" onClick={() => trocar('criar')}>
                Criar conta
              </button>
            </>
          ) : (
            <>
              Já tem conta?{' '}
              <button type="button" className="link" onClick={() => trocar('entrar')}>
                Entrar
              </button>
            </>
          )}
        </p>
        <p className="entrar__seguro">
          <ShieldCheck size={14} /> Seus dados ficam só na sua conta.
        </p>
      </form>
    </div>
  )
}

function traduzir(msg: string) {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/email not confirmed/i.test(msg)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
  if (/already registered/i.test(msg)) return 'Esse e-mail já tem conta. Tente entrar.'
  if (/at least 6/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/rate limit/i.test(msg)) return 'Muitas tentativas seguidas. Espere um pouco e tente de novo.'
  return msg
}
