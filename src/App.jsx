import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const mesiItaliani = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
]

const giorniSettimana = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostraPassword, setMostraPassword] = useState(false)

  const [scadenze, setScadenze] = useState([])
  const [titolo, setTitolo] = useState('')
  const [dataScadenza, setDataScadenza] = useState('')
  const [note, setNote] = useState('')
  const [idModifica, setIdModifica] = useState(null)

  const [vista, setVista] = useState('lista')
  const [meseCorrente, setMeseCorrente] = useState(new Date())
  const [annoStampa, setAnnoStampa] = useState(new Date().getFullYear())
  const [mesiDaStampare, setMesiDaStampare] = useState([new Date().getMonth()])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

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

  async function salvaScadenza(e) {
    e.preventDefault()

    if (!titolo || !dataScadenza) {
      alert('Inserisci nome e data della scadenza')
      return
    }

    if (idModifica) {
      const { error } = await supabase
        .from('scadenze')
        .update({ titolo, data: dataScadenza, note })
        .eq('id', idModifica)

      if (error) {
        alert('Errore modifica: ' + error.message)
        return
      }
    } else {
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
    }

    setTitolo('')
    setDataScadenza('')
    setNote('')
    setIdModifica(null)
    caricaScadenze()
  }

  function preparaModifica(item) {
    setTitolo(item.titolo)
    setDataScadenza(item.data)
    setNote(item.note || '')
    setIdModifica(item.id)
    setVista('lista')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function annullaModifica() {
    setTitolo('')
    setDataScadenza('')
    setNote('')
    setIdModifica(null)
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

    const { error } = await supabase.from('scadenze').delete().eq('id', id)

    if (error) {
      alert('Errore eliminazione: ' + error.message)
      return
    }

    caricaScadenze()
  }

  function giorniAllaScadenza(data) {
    const oggi = new Date()
    const scadenza = new Date(data)

    oggi.setHours(0, 0, 0, 0)
    scadenza.setHours(0, 0, 0, 0)

    return Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24))
  }

  function testoScadenza(item) {
    if (item.completata) return 'Completata'

    const giorni = giorniAllaScadenza(item.data)

    if (giorni < 0) return 'Scaduta'
    if (giorni === 0) return 'Scade oggi'
    if (giorni === 1) return 'Scade domani'
    return `Mancano ${giorni} giorni`
  }

  function stileScadenza(item) {
    if (item.completata) return styles.scadenzaCompletata

    const giorni = giorniAllaScadenza(item.data)

    if (giorni < 0) return styles.scadenzaScaduta
    if (giorni <= 6) return styles.scadenzaUrgente

    return styles.scadenzaNormale
  }

  function dataItaliana(dataIso) {
    return new Date(dataIso).toLocaleDateString('it-IT')
  }

  function cambiaSelezioneMese(mese) {
    if (mesiDaStampare.includes(mese)) {
      setMesiDaStampare(mesiDaStampare.filter(m => m !== mese))
    } else {
      setMesiDaStampare([...mesiDaStampare, mese].sort((a, b) => a - b))
    }
  }

  function selezionaTuttiIMesi() {
    setMesiDaStampare([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  }

  function stampaMesiSelezionati() {
    if (mesiDaStampare.length === 0) {
      alert('Seleziona almeno un mese')
      return
    }

    setVista('stampa-mesi')
    setTimeout(() => window.print(), 300)
  }

  function stampaAnnoIntero() {
    setMesiDaStampare([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    setVista('stampa-anno')
    setTimeout(() => window.print(), 300)
  }

  function scadenzeDelMese(anno, mese) {
    return scadenze.filter(item => {
      const d = new Date(item.data)
      return d.getFullYear() === Number(anno) && d.getMonth() === mese
    })
  }

  function cambiaMese(numero) {
    const nuovaData = new Date(meseCorrente)
    nuovaData.setMonth(nuovaData.getMonth() + numero)
    setMeseCorrente(nuovaData)
  }

  function dataFormatoISO(data) {
    const anno = data.getFullYear()
    const mese = String(data.getMonth() + 1).padStart(2, '0')
    const giorno = String(data.getDate()).padStart(2, '0')
    return `${anno}-${mese}-${giorno}`
  }

  function giorniDelCalendario() {
    const anno = meseCorrente.getFullYear()
    const mese = meseCorrente.getMonth()
    const primoGiorno = new Date(anno, mese, 1)
    const ultimoGiorno = new Date(anno, mese + 1, 0)

    let giornoSettimana = primoGiorno.getDay()
    if (giornoSettimana === 0) giornoSettimana = 7

    const giorni = []

    for (let i = 0; i < giornoSettimana - 1; i++) {
      giorni.push(null)
    }

    for (let giorno = 1; giorno <= ultimoGiorno.getDate(); giorno++) {
      giorni.push(new Date(anno, mese, giorno))
    }

    return giorni
  }

  if (!session) {
    return (
      <div style={styles.pagina}>
        <div style={styles.card}>
          <h1 style={styles.titolo}>Le mie scadenze</h1>
          <p style={styles.testo}>Accedi con email e password.</p>

          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} />

          <input
            type={mostraPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={styles.input}
          />

          <button type="button" onClick={() => setMostraPassword(!mostraPassword)} style={styles.bottoneSecondario}>
            {mostraPassword ? 'Nascondi password' : 'Mostra password'}
          </button>

          <button onClick={accedi} style={styles.bottonePrimario}>Accedi</button>
          <button onClick={registrati} style={styles.bottoneSecondario}>Registrati</button>
          <button onClick={resetPassword} style={styles.bottoneSecondario}>Reset password</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.pagina}>
      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }

            body {
              margin: 0;
              background: white;
            }

            .pagina-stampa {
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }

            .mese-stampa {
              break-inside: avoid;
              page-break-inside: avoid;
              margin-bottom: 25px;
            }
          }
        `}
      </style>

      <div style={styles.contenitore}>
        <div style={styles.card} className="no-print">
          <h1 style={styles.titolo}>Le mie scadenze</h1>
          <p style={styles.testo}>Accesso effettuato: {session.user.email}</p>

          <button onClick={esci} style={styles.bottoneEsci}>
            Esci dall’account
          </button>
        </div>

        <div style={styles.card} className="no-print">
          <h2>{idModifica ? 'Modifica scadenza' : 'Aggiungi scadenza'}</h2>

          <form onSubmit={salvaScadenza}>
            <input placeholder="Nome scadenza" value={titolo} onChange={e => setTitolo(e.target.value)} style={styles.input} />

            <input type="date" value={dataScadenza} onChange={e => setDataScadenza(e.target.value)} style={styles.input} />

            <textarea placeholder="Note" value={note} onChange={e => setNote(e.target.value)} style={styles.textarea} />

            <button type="submit" style={styles.bottonePrimario}>
              {idModifica ? 'Salva modifica' : 'Aggiungi'}
            </button>

            {idModifica && (
              <button type="button" onClick={annullaModifica} style={styles.bottoneSecondario}>
                Annulla modifica
              </button>
            )}
          </form>
        </div>

        <div style={styles.card} className="no-print">
          <button onClick={() => setVista('lista')} style={vista === 'lista' ? styles.bottonePrimario : styles.bottoneSecondario}>
            Vista lista
          </button>

          <button onClick={() => setVista('calendario')} style={vista === 'calendario' ? styles.bottonePrimario : styles.bottoneSecondario}>
            Vista calendario
          </button>

          <button onClick={() => setVista('stampa')} style={vista === 'stampa' ? styles.bottonePrimario : styles.bottoneSecondario}>
            Stampa PDF
          </button>
        </div>

        {vista === 'lista' && (
          <div>
            {scadenze.length === 0 && (
              <div style={styles.card}>
                <p>Nessuna scadenza inserita.</p>
              </div>
            )}

            {scadenze.map(item => (
              <div key={item.id} style={{ ...styles.scadenza, ...stileScadenza(item) }}>
                <h3 style={{ textDecoration: item.completata ? 'line-through' : 'none' }}>
                  {item.titolo}
                </h3>

                <p>Data: {dataItaliana(item.data)}</p>
                {item.note && <p>Note: {item.note}</p>}
                <p><strong>{testoScadenza(item)}</strong></p>

                <button onClick={() => cambiaStato(item)} style={styles.bottoneSecondario}>
                  {item.completata ? 'Segna da fare' : 'Segna completata'}
                </button>

                <button onClick={() => preparaModifica(item)} style={styles.bottoneSecondario}>
                  Modifica
                </button>

                <button onClick={() => eliminaScadenza(item.id)} style={styles.bottoneElimina}>
                  Elimina
                </button>
              </div>
            ))}
          </div>
        )}

        {vista === 'calendario' && (
          <div style={styles.card}>
            <div style={styles.rigaCalendario} className="no-print">
              <button onClick={() => cambiaMese(-1)} style={styles.bottoneMini}>
                Mese precedente
              </button>

              <h2 style={styles.titoloCalendario}>
                {meseCorrente.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
              </h2>

              <button onClick={() => cambiaMese(1)} style={styles.bottoneMini}>
                Mese successivo
              </button>
            </div>

            <div style={styles.grigliaSettimana}>
              {giorniSettimana.map(giorno => (
                <div key={giorno} style={styles.nomeGiorno}>{giorno}</div>
              ))}
            </div>

            <div style={styles.grigliaCalendario}>
              {giorniDelCalendario().map((giorno, index) => {
                if (!giorno) return <div key={index} style={styles.giornoVuoto}></div>

                const iso = dataFormatoISO(giorno)
                const eventi = scadenze.filter(item => item.data === iso)

                return (
                  <div key={iso} style={styles.giornoCalendario}>
                    <strong>{giorno.getDate()}</strong>

                    {eventi.map(item => (
                      <div key={item.id} style={styles.eventoCalendario}>
                        {item.titolo}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {vista === 'stampa' && (
          <div style={styles.card} className="no-print">
            <h2>Stampa scadenze</h2>

            <label style={styles.label}>Anno da stampare</label>
            <input
              type="number"
              value={annoStampa}
              onChange={e => setAnnoStampa(e.target.value)}
              style={styles.input}
            />

            <p>Scegli i mesi da stampare:</p>

            <div style={styles.grigliaMesi}>
              {mesiItaliani.map((mese, index) => (
                <label key={mese} style={styles.checkMese}>
                  <input
                    type="checkbox"
                    checked={mesiDaStampare.includes(index)}
                    onChange={() => cambiaSelezioneMese(index)}
                  />
                  {mese}
                </label>
              ))}
            </div>

            <button onClick={stampaMesiSelezionati} style={styles.bottonePrimario}>
              Stampa mesi selezionati
            </button>

            <button onClick={stampaAnnoIntero} style={styles.bottoneSecondario}>
              Stampa intero anno
            </button>

            <button onClick={selezionaTuttiIMesi} style={styles.bottoneSecondario}>
              Seleziona tutti i mesi
            </button>

            <button onClick={() => setMesiDaStampare([])} style={styles.bottoneSecondario}>
              Deseleziona tutti
            </button>
          </div>
        )}

        {(vista === 'stampa-mesi' || vista === 'stampa-anno') && (
          <div style={styles.stampaArea} className="pagina-stampa">
            <div className="no-print">
              <button onClick={() => setVista('stampa')} style={styles.bottoneSecondario}>
                Torna alla scelta stampa
              </button>

              <button onClick={() => window.print()} style={styles.bottonePrimario}>
                Stampa di nuovo
              </button>
            </div>

            <h1 style={styles.titoloStampa}>Scadenze {annoStampa}</h1>

            {mesiDaStampare.map(mese => {
              const elementi = scadenzeDelMese(annoStampa, mese)

              return (
                <div key={mese} className="mese-stampa" style={styles.meseStampa}>
                  <h2 style={styles.nomeMeseStampa}>{mesiItaliani[mese]} {annoStampa}</h2>

                  {elementi.length === 0 ? (
                    <p>Nessuna scadenza.</p>
                  ) : (
                    <table style={styles.tabella}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Data</th>
                          <th style={styles.th}>Scadenza</th>
                          <th style={styles.th}>Note</th>
                          <th style={styles.th}>Stato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {elementi.map(item => (
                          <tr key={item.id}>
                            <td style={styles.td}>{dataItaliana(item.data)}</td>
                            <td style={styles.td}>{item.titolo}</td>
                            <td style={styles.td}>{item.note || '-'}</td>
                            <td style={styles.td}>{item.completata ? 'Completata' : 'Da fare'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}
          </div>
        )}
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
    maxWidth: 900,
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
  label: {
    display: 'block',
    marginBottom: 8,
    fontWeight: 'bold'
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
  bottoneMini: {
    padding: 10,
    border: 0,
    borderRadius: 10,
    background: '#e5e7eb',
    cursor: 'pointer'
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
    padding: 20,
    borderRadius: 16,
    boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
    marginBottom: 15,
    border: '2px solid transparent'
  },
  scadenzaNormale: {
    background: 'white',
    borderColor: '#e5e7eb'
  },
  scadenzaUrgente: {
    background: '#fff7ed',
    borderColor: '#f97316'
  },
  scadenzaScaduta: {
    background: '#fef2f2',
    borderColor: '#dc2626'
  },
  scadenzaCompletata: {
    background: '#f9fafb',
    borderColor: '#d1d5db',
    color: '#6b7280'
  },
  grigliaMesi: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 10,
    marginBottom: 20
  },
  checkMese: {
    background: '#f9fafb',
    padding: 12,
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    display: 'flex',
    gap: 8,
    alignItems: 'center'
  },
  stampaArea: {
    background: 'white',
    padding: 25,
    borderRadius: 16,
    boxShadow: '0 10px 25px rgba(0,0,0,0.08)'
  },
  titoloStampa: {
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 25
  },
  meseStampa: {
    marginBottom: 30
  },
  nomeMeseStampa: {
    borderBottom: '2px solid #111827',
    paddingBottom: 8
  },
  tabella: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: 10
  },
  th: {
    border: '1px solid #d1d5db',
    padding: 8,
    background: '#f3f4f6',
    textAlign: 'left'
  },
  td: {
    border: '1px solid #d1d5db',
    padding: 8,
    verticalAlign: 'top'
  },
  rigaCalendario: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20
  },
  titoloCalendario: {
    margin: 0,
    textTransform: 'capitalize',
    textAlign: 'center'
  },
  grigliaSettimana: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 6,
    marginBottom: 6
  },
  nomeGiorno: {
    textAlign: 'center',
    fontWeight: 'bold',
    padding: 8
  },
  grigliaCalendario: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 6
  },
  giornoVuoto: {
    minHeight: 100,
    background: '#f9fafb',
    borderRadius: 10
  },
  giornoCalendario: {
    minHeight: 100,
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 8,
    background: '#ffffff'
  },
  eventoCalendario: {
    marginTop: 6,
    background: '#dbeafe',
    color: '#1e3a8a',
    padding: 6,
    borderRadius: 8,
    fontSize: 13
  }
}

export default App