/** Aparece só enquanto o .env.local não foi preenchido. */
export function Configurar() {
  return (
    <div className="entrar">
      <div className="entrar__cartao">
        <div className="marca">
          <span className="marca__selo">c</span>
          <span className="marca__nome">caixinha</span>
        </div>
        <h1 className="entrar__titulo">Falta ligar o Supabase</h1>
        <p className="entrar__sub">
          Copie o arquivo <code>.env.example</code> para <code>.env.local</code>, preencha a URL e a chave do seu
          projeto e reinicie o <code>npm run dev</code>. O passo a passo está no README.
        </p>
      </div>
    </div>
  )
}
