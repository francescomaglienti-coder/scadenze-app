import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostraPassword, setMostraPassword] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  async function accedi() {
    if (!email || !password) {
      alert('Inserisci email e password')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      alert('Errore accesso: ' + error.message)
    }
  }

  async function registrati() {
    if (!email || !password) {
      alert('Inserisci email e password')
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) {
      const messaggio = error.message.toLowerCase()

      if (
        messaggio.includes('already') ||
        messaggio.includes('registered') ||
        messaggio.includes('user already')
      ) {
        alert('Questo utente è già registrato. Usa Accedi oppure Reset password.')
      } else {
        alert('Errore registrazione: ' + error.message)
      }

      return
    }

    alert('Registrazione completata. Ora puoi accedere con email e password.')
  }

  async function resetPassword() {
    if (!email) {
      alert('Inserisci prima la tua email')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://scadenze-app-azure.vercel.app'
    })

    if (error) {
      alert('Errore reset password: ' + error.message)
    } else {
      alert('Ti ho inviato una email per reimpostare la password.')
    }
  }

  async function esci() {
    await supabase.auth.signOut()
    setSession(null)
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
      <div style={styles.card}>
        <h1 style={styles.titolo}>Le mie scadenze</h1>
        <p style={styles.testo}>Accesso effettuato: {session.user.email}</p>

        <button onClick={esci} style={styles.bottoneEsci}>
          Esci dall’account
        </button>

        <p style={styles.testo}>
          Test riuscito: login con password funzionante.
        </p>
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
  card: {
    maxWidth: 500,
    margin: '40px auto',
    background: 'white',
    padding: 25,
    borderRadius: 16,
    boxShadow: '0 10px 25px rgba(0,0,0,0.08)'
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
  }
}

export default App