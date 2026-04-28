import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostraPassword, setMostraPassword] = useState(false)

  const [scadenze, setScadenze] = useState([])
  const [titolo, setTitolo] = useState('')
  const [dataScadenza, setDataScadenza] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) caricaScadenze()
  }, [session])

  async function accedi() {
    if (!email || !password) {
      alert('Inserisci email e password')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) alert('Errore accesso: ' + error.message)
  }

  async function registrati() {
    if (!email || !password) {
      alert('Inserisci email e password')
      return
    }

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      alert('Errore registrazione: ' + error.message)
      return
    }

    alert('Registrazione completata. Ora puoi accedere.')
  }

  async function resetPassword() {
    if (!email) {
      alert('Inserisci prima la tua email')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://scadenze-app-azure.vercel.app'
    })

    if (error) alert('Errore reset password: ' + error.message)
    else alert('Ti ho inviato una email per reimpostare la password.')
  }

  async function esci() {
    await supabase.auth.signOut()
    setSession(null)
    setScadenze([])
  }

  async function caricaScadenze() {
    const { data, error } = await supabase
      .from('scadenze')
      .select('*')
      .order('data', { ascending: true })

    if (error) {
      alert('Errore caricamento scadenze: ' + error.message)
      return
    }

    setScadenze(data || [])
  }

  async function aggiungiScadenza(e) {
    e.preventDefault()

    if (!titolo || !dataScadenza) {
      alert('Inserisci nome e data della scadenza')
      return
    }

    const { error } = await supabase.from('scadenze').insert({
      titolo,
      data: dataScadenza,
      note,
      user_id: session.user.id
    })

    if (error) {
      alert('Errore salvataggio: ' + error.message)
      return
    }

    setTitolo('')
    setDataScadenza('')
    setNote('')
    caricaScadenze()
  }

  async function cambiaStato(item) {
    const { error } = await supabase
      .from('scadenze')
      .update({ completata: !item.completata })
      .eq('id', item.id)

    if (error) {
      alert('Errore aggiornamento: ' + error.message)
      return
    }

    caricaScadenze()
  }

  async function eliminaScadenza(id) {
    if (!confirm('Vuoi eliminare questa scadenza?')) return

    const { error } = await supabase
      .from('scadenze')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Errore eliminazione: ' + error.message)
      return
    }

    caricaScadenze()
  }

  if (!session) {
    return (
      <div style={styles.pagina}>
        <div style={styles.card}>
          <h1 style={styles.titolo}>Le mie scadenze</h1>
          <p style={styles.testo}>Accedi con email e password.</p>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={styles.input}
          />

          <input
            type={mostraPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={styles.input}
          />

          <button
            type="button"
            onClick={() => setMostraPassword(!mostraPassword)}
            style={styles.bottoneSecondario}
          >
            {mostraPassword ? 'Nascondi password' : 'Mostra password'}
          </button>

          <button onClick={accedi} style={styles.bottonePrimario}>
            Accedi
          </button>

          <button onClick={registrati} style={styles.bottoneSecondario}>
            Registrati
          </button>

          <button onClick={resetPassword} style={styles.bottoneSecondario}>
            Reset password
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.pagina}>
      <div style={styles.contenitore}>
        <div style={styles.card}>
          <h1 style={styles.titolo}>Le mie scadenze</h1>
          <p style={styles.testo}>Accesso effettuato: {session.user.email}</p>

          <button onClick={esci} style={styles.bottoneEsci}>
            Esci dall’account
          </button>
        </div>

        <div style={styles.card}>
          <h2>Aggiungi scadenza</h2>

          <form onSubmit={aggiungiScadenza}>
            <input
              placeholder="Nome scadenza"
              value={titolo}
              onChange={e => setTitolo(e.target.value)}
              style={styles.input}
            />

            <input
              type="date"
              value={dataScadenza}
              onChange={e => setDataScadenza(e.target.value)}
              style={styles.input}
            />

            <textarea
              placeholder="Note"
              value={note}
              onChange={e => setNote(e.target.value)}
              style={styles.textarea}
            />

            <button type="submit" style={styles.bottonePrimario}>
              Aggiungi
            </button>
          </form>
        </div>

        {scadenze.length === 0 && (
          <div style={styles.card}>
            <p>Nessuna scadenza inserita.</p>
          </div>
        )}

        {scadenze.map(item => (
          <div key={item.id} style={styles.scadenza}>
            <h3 style={{ textDecoration: item.completata ? 'line-through' : 'none' }}>
              {item.titolo}
            </h3>

            <p>Data: {item.data}</p>

            {item.note && <p>Note: {item.note}</p>}

            <p>
              Stato: <strong>{item.completata ? 'Completata' : 'Da fare'}</strong>
            </p>

            <button onClick={() => cambiaStato(item)} style={styles.bottoneSecondario}>
              {item.completata ? 'Segna da fare' : 'Segna completata'}
            </button>

            <button onClick={() => eliminaScadenza(item.id)} style={styles.bottoneElimina}>
              Elimina
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  pagina: {
    minHeight: '100vh',
    background: '#f3f4f6',
    padding: 30,
    fontFamily: 'Arial, sans-serif'
  },
  contenitore: {
    maxWidth: 700,
    margin: '0 auto'
  },
  card: {
    background: 'white',
    padding: 25,
    borderRadius: 16,
    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
    marginBottom: 20
  },
  titolo: {
    marginTop: 0,
    color: '#111827'
  },
  testo: {
    color: '#4b5563'
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: 13,
    borderRadius: 10,
    border: '1px solid #d1d5db',
    marginBottom: 12,
    fontSize: 16
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: 13,
    borderRadius: 10,
    border: '1px solid #d1d5db',
    marginBottom: 12,
    fontSize: 16,
    minHeight: 90
  },
  bottonePrimario: {
    width: '100%',
    padding: 12,
    border: 0,
    borderRadius: 10,
    background: '#2563eb',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: 10
  },
  bottoneSecondario: {
    width: '100%',
    padding: 12,
    border: 0,
    borderRadius: 10,
    background: '#e5e7eb',
    color: '#111827',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: 10
  },
  bottoneEsci: {
    padding: 12,
    border: 0,
    borderRadius: 10,
    background: '#fee2e2',
    color: '#991b1b',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  bottoneElimina: {
    width: '100%',
    padding: 12,
    border: 0,
    borderRadius: 10,
    background: '#fee2e2',
    color: '#991b1b',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  scadenza: {
    background: 'white',
    padding: 20,
    borderRadius: 16,
    boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
    marginBottom: 15
  }
}

export default App