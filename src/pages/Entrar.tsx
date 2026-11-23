import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Modo = 'entrar' | 'criar'

export function Entrar() {
  const [modo, setModo] = useState<Modo>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
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
        <p className="entrar__frase">Saiba para onde vai cada real, sem planilha.</p>
        <div className="entrar__amostra">
          <span className="entrar__amostra-rotulo">Sobrou no mês</span>
          <span className="entrar__amostra-valor">
            <small>R$</small>1.284<small>,50</small>
          </span>
          <span className="entrar__amostra-barra">
            <i style={{ flexGrow: 45, background: '#C2553A' }} />
            <i style={{ flexGrow: 20, background: '#D08A2E' }} />
            <i style={{ flexGrow: 12, background: '#5A6BB0' }} />
            <i style={{ flexGrow: 30 }} className="entrar__amostra-sobra" />
          </span>
        </div>
      </aside>
      <form className="entrar__cartao entra" onSubmit={enviar}>
        <div className="marca entrar__marca-celular">
          <span className="marca__selo">c</span>
          <span className="marca__nome">caixinha</span>
        </div>
        <h1 className="entrar__titulo">{modo === 'entrar' ? 'Que bom te ver de novo' : 'Vamos começar'}</h1>
        <p className="entrar__sub">
          {modo === 'entrar' ? 'Entre para ver suas contas do mês.' : 'Crie sua conta com e-mail e senha.'}
        </p>

        {modo === 'criar' && (
          <label className="campo">
            <span className="campo__rotulo">Como quer ser chamado</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="given-name" />
          </label>
        )}
        <label className="campo">
          <span className="campo__rotulo">E-mail</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="campo">
          <span className="campo__rotulo">Senha</span>
          <input
            type="password"
            required
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
          />
        </label>

        {erro && <p className="alerta alerta--erro">{erro}</p>}
        {aviso && <p className="alerta">{aviso}</p>}

        <button className="btn btn--primario btn--largo" disabled={enviando}>
          {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
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
