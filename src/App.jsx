import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const mesiItaliani = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
]

function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostraPassword, setMostraPassword] = useState(false)
  const [scadenze, setScadenze] = useState([])

  const [titolo, setTitolo] = useState('')
  const [data, setData] = useState('')
  const [note, setNote] = useState('')
  const [idModifica, setIdModifica] = useState(null)

  const [vista, setVista] = useState('lista')
  const [meseCorrente, setMeseCorrente] = useState(new Date())
  const [annoStampa, setAnnoStampa] = useState(new Date().getFullYear())
  const [mesiDaStampare, setMesiDaStampare] = useState([new Date().getMonth()])

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
    if (session) {
      caricaScadenze()
    }
  }, [session])

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
      setScadenze([])
      setEmail('')
    }

    async function caricaScadenze() {
      const { data, error } = await supabase
        .from('scadenze')
        .select('*')
        .order('data', { ascending: true })

      if (error) {
        alert('Errore caricamento: ' + error.message)
        return
      }

      setScadenze(data || [])
    }

    async function salvaScadenza(e) {
      e.preventDefault()

      if (!titolo || !data) {
        alert('Inserisci sia il nome sia la data')
        return
      }

      if (idModifica) {
        const { error } = await supabase
          .from('scadenze')
          .update({ titolo, data, note })
          .eq('id', idModifica)

        if (error) {
          alert('Errore modifica: ' + error.message)
          return
        }
      } else {
        const { error } = await supabase
          .from('scadenze')
          .insert({
            titolo,
            data,
            note,
            user_id: session.user.id
          })

        if (error) {
          alert('Errore salvataggio: ' + error.message)
          return
        }
      }

      setTitolo('')
      setData('')
      setNote('')
      setIdModifica(null)
      caricaScadenze()
    }

    function modificaScadenza(item) {
      setTitolo(item.titolo)
      setData(item.data)
      setNote(item.note || '')
      setIdModifica(item.id)
      setVista('lista')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    function annullaModifica() {
      setTitolo('')
      setData('')
      setNote('')
      setIdModifica(null)
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

    async function rinviaDiUnAnno(item) {
      const nuovaData = new Date(item.data)
      nuovaData.setFullYear(nuovaData.getFullYear() + 1)

      const dataAggiornata = nuovaData.toISOString().split('T')[0]

      const { error } = await supabase
        .from('scadenze')
        .update({
          data: dataAggiornata,
          completata: false
        })
        .eq('id', item.id)

      if (error) {
        alert('Errore rinvio: ' + error.message)
        return
      }

      caricaScadenze()
    }

    function giorniAllaScadenza(dataScadenza) {
      const oggi = new Date()
      const scadenza = new Date(dataScadenza)

      oggi.setHours(0, 0, 0, 0)
      scadenza.setHours(0, 0, 0, 0)

      return Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24))
    }

    function testoScadenza(dataScadenza) {
      const giorni = giorniAllaScadenza(dataScadenza)

      if (giorni < 0) return 'Scaduta'
      if (giorni === 0) return 'Scade oggi'
      if (giorni === 1) return 'Scade domani'
      return `Mancano ${giorni} giorni`
    }

    function dataItaliana(dataIso) {
      return new Date(dataIso).toLocaleDateString('it-IT')
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

    function creaGiorniCalendario() {
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
        alert('Seleziona almeno un mese da stampare')
        return
      }

      setVista('stampa-mesi')
      setTimeout(() => window.print(), 200)
    }

    function stampaAnnoIntero() {
      selezionaTuttiIMesi()
      setVista('stampa-anno')
      setTimeout(() => window.print(), 200)
    }

    const scadenzeOrdinate = [...scadenze].sort(
      (a, b) => new Date(a.data) - new Date(b.data)
    )

    const giorniCalendario = creaGiorniCalendario()
    const giorniSettimana = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

    function scadenzeDelMese(anno, mese) {
      return scadenzeOrdinate.filter(item => {
        const d = new Date(item.data)
        return d.getFullYear() === anno && d.getMonth() === mese
      })
    }
    if (!session) {
      return (
        <div style={styles.pagina}>
          <div style={styles.contenitore}>
            <section style={styles.card}>
              <h1 style={styles.titolo}>Le mie scadenze TEST</h1>
              <p style={styles.sottotitolo}>
                Accedi con la tua email per sincronizzare le scadenze.
              </p>

              <input
                type="email"
                placeholder="La tua email"
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

            </section>
          </div>
        </div>
      )
    }

    return (
      <div style={styles.pagina} className="pagina">
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

            .pagina {
              background: white !important;
              padding: 0 !important;
            }

            .contenitore {
              max-width: 100% !important;
              margin: 0 !important;
            }

            .print-section {
              box-shadow: none !important;
              border: none !important;
              padding: 20px !important;
            }

            .mese-stampa {
              break-inside: avoid;
              page-break-inside: avoid;
              margin-bottom: 25px;
            }
          }
        `}
        </style>

        <div style={styles.contenitore} className="contenitore">
          <header style={styles.header} className="no-print">
            <h1 style={styles.titolo}>Le mie scadenze</h1>
            <p style={styles.sottotitolo}>
              Accesso effettuato: {session.user.email}
            </p>

            <button onClick={esci} style={styles.bottoneEsci}>
              Esci dall’account
            </button>
          </header>

          <section style={styles.card} className="no-print">
            <h2 style={styles.cardTitolo}>
              {idModifica ? 'Modifica scadenza' : 'Aggiungi una scadenza'}
            </h2>

            <form onSubmit={salvaScadenza}>
              <label style={styles.label}>Nome scadenza</label>
              <input
                placeholder="Es. Assicurazione auto"
                value={titolo}
                onChange={e => setTitolo(e.target.value)}
                style={styles.input}
              />

              <label style={styles.label}>Data</label>
              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                style={styles.input}
              />

              <label style={styles.label}>Note</label>
              <textarea
                placeholder="Es. documenti da preparare, importo, riferimento..."
                value={note}
                onChange={e => setNote(e.target.value)}
                style={styles.textarea}
              />

              <div style={styles.rigaBottoni}>
                <button type="submit" style={styles.bottonePrimario}>
                  {idModifica ? 'Salva modifica' : 'Aggiungi'}
                </button>

                {idModifica && (
                  <button type="button" onClick={annullaModifica} style={styles.bottoneSecondario}>
                    Annulla
                  </button>
                )}
              </div>
            </form>
          </section>

          <div style={styles.rigaBottoni} className="no-print">
            <button
              onClick={() => setVista('lista')}
              style={vista === 'lista' ? styles.bottonePrimario : styles.bottoneSecondario}
            >
              Vista lista
            </button>

            <button
              onClick={() => setVista('calendario')}
              style={vista === 'calendario' ? styles.bottonePrimario : styles.bottoneSecondario}
            >
              Vista calendario
            </button>

            <button
              onClick={() => setVista('stampa')}
              style={vista === 'stampa' ? styles.bottonePrimario : styles.bottoneSecondario}
            >
              Stampa
            </button>
          </div>

          {vista === 'lista' && (
            <section style={styles.lista}>
              {scadenzeOrdinate.length === 0 && (
                <div style={styles.vuoto}>Nessuna scadenza inserita.</div>
              )}

              {scadenzeOrdinate.map(item => {
                const giorni = giorniAllaScadenza(item.data)
                const urgente = giorni <= 5 && !item.completata
                const scaduta = giorni < 0 && !item.completata

                return (
                  <div
                    key={item.id}
                    style={{
                      ...styles.scadenza,
                      borderColor: scaduta ? '#dc2626' : urgente ? '#f97316' : '#e5e7eb',
                      background: item.completata
                        ? '#f9fafb'
                        : scaduta
                          ? '#fef2f2'
                          : urgente
                            ? '#fff7ed'
                            : '#ffffff'
                    }}
                  >
                    <h3
                      style={{
                        ...styles.nomeScadenza,
                        textDecoration: item.completata ? 'line-through' : 'none',
                        color: item.completata ? '#6b7280' : '#111827'
                      }}
                    >
                      {item.titolo}
                    </h3>

                    <p style={styles.dataScadenza}>Data: {dataItaliana(item.data)}</p>

                    {item.note && (
                      <p style={styles.noteScadenza}>Note: {item.note}</p>
                    )}

                    <span style={styles.etichetta}>
                      {item.completata ? 'Completata' : testoScadenza(item.data)}
                    </span>

                    <div style={styles.rigaBottoniCard}>
                      <button onClick={() => cambiaStato(item)} style={styles.bottonePiccolo}>
                        {item.completata ? 'Da fare' : 'Completata'}
                      </button>

                      <button onClick={() => modificaScadenza(item)} style={styles.bottonePiccolo}>
                        Modifica
                      </button>

                      <button onClick={() => rinviaDiUnAnno(item)} style={styles.bottonePiccolo}>
                        Rinvia 1 anno
                      </button>

                      <button onClick={() => eliminaScadenza(item.id)} style={styles.bottoneElimina}>
                        Elimina
                      </button>
                    </div>
                  </div>
                )
              })}
            </section>
          )}

          {vista === 'calendario' && (
            <section style={styles.calendario}>
              <div style={styles.testataCalendario}>
                <button onClick={() => cambiaMese(-1)} style={styles.bottoneSecondario}>
                  Mese precedente
                </button>

                <h2 style={styles.titoloCalendario}>
                  {meseCorrente.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                </h2>

                <button onClick={() => cambiaMese(1)} style={styles.bottoneSecondario}>
                  Mese successivo
                </button>
              </div>

              <div style={styles.grigliaSettimana}>
                {giorniSettimana.map(giorno => (
                  <div key={giorno} style={styles.nomeGiorno}>{giorno}</div>
                ))}
              </div>

              <div style={styles.grigliaCalendario}>
                {giorniCalendario.map((giorno, index) => {
                  if (!giorno) return <div key={index} style={styles.giornoVuoto}></div>

                  const iso = dataFormatoISO(giorno)
                  const eventi = scadenzeOrdinate.filter(item => item.data === iso)

                  return (
                    <div key={iso} style={styles.giornoCalendario}>
                      <div style={styles.numeroGiorno}>{giorno.getDate()}</div>

                      {eventi.map(item => (
                        <div key={item.id} style={styles.eventoCalendario}>
                          <strong>{item.titolo}</strong>
                          {item.note && <div style={styles.noteCalendario}>{item.note}</div>}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {vista === 'stampa' && (
            <section style={styles.card} className="no-print">
              <h2 style={styles.cardTitolo}>Stampa scadenze</h2>

              <label style={styles.label}>Anno da stampare</label>
              <input
                type="number"
                value={annoStampa}
                onChange={e => setAnnoStampa(Number(e.target.value))}
                style={styles.input}
              />

              <p style={styles.sottotitolo}>Scegli i mesi da stampare:</p>

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

              <div style={styles.rigaBottoni}>
                <button onClick={stampaMesiSelezionati} style={styles.bottoneStampa}>
                  Stampa mesi selezionati
                </button>

                <button onClick={stampaAnnoIntero} style={styles.bottonePrimario}>
                  Stampa anno intero
                </button>

                <button onClick={selezionaTuttiIMesi} style={styles.bottoneSecondario}>
                  Seleziona tutti i mesi
                </button>

                <button onClick={() => setMesiDaStampare([])} style={styles.bottoneSecondario}>
                  Deseleziona tutti
                </button>
              </div>
            </section>
          )}

          {(vista === 'stampa-mesi' || vista === 'stampa-anno') && (
            <section style={styles.stampaArea} className="print-section">
              <div className="no-print" style={styles.rigaBottoni}>
                <button onClick={() => setVista('stampa')} style={styles.bottoneSecondario}>
                  Torna alla scelta stampa
                </button>

                <button onClick={() => window.print()} style={styles.bottoneStampa}>
                  Stampa di nuovo
                </button>
              </div>

              <h1 style={styles.titoloStampa}>
                Scadenze {annoStampa}
              </h1>

              {mesiDaStampare.map(mese => {
                const elementi = scadenzeDelMese(annoStampa, mese)

                return (
                  <div key={mese} className="mese-stampa" style={styles.meseStampa}>
                    <h2 style={styles.nomeMeseStampa}>
                      {mesiItaliani[mese]} {annoStampa}
                    </h2>

                    {elementi.length === 0 ? (
                      <p style={styles.nessunaStampa}>Nessuna scadenza.</p>
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
            </section>
          )}
        </div>
      </div>
    )
  }
}

const styles = {
  pagina: {
    minHeight: '100vh',
    background: '#f3f4f6',
    padding: '30px 15px',
    fontFamily: 'Arial, sans-serif'
  },
  contenitore: {
    maxWidth: 900,
    margin: '0 auto'
  },
  header: {
    marginBottom: 25
  },
  titolo: {
    fontSize: 36,
    margin: 0,
    color: '#111827'
  },
  sottotitolo: {
    color: '#6b7280',
    marginTop: 8
  },
  card: {
    background: '#ffffff',
    padding: 22,
    borderRadius: 16,
    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
    marginBottom: 25
  },
  cardTitolo: {
    marginTop: 0,
    fontSize: 22
  },
  label: {
    display: 'block',
    marginBottom: 6,
    fontWeight: 'bold',
    color: '#374151'
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: 13,
    borderRadius: 10,
    border: '1px solid #d1d5db',
    marginBottom: 15,
    fontSize: 16
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: 13,
    borderRadius: 10,
    border: '1px solid #d1d5db',
    marginBottom: 15,
    fontSize: 16,
    minHeight: 90,
    resize: 'vertical'
  },
  rigaBottoni: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 20
  },
  bottonePrimario: {
    padding: '12px 18px',
    border: 0,
    borderRadius: 10,
    background: '#2563eb',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  bottoneSecondario: {
    padding: '12px 18px',
    border: 0,
    borderRadius: 10,
    background: '#e5e7eb',
    color: '#111827',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  bottoneEsci: {
    padding: '10px 14px',
    border: 0,
    borderRadius: 10,
    background: '#fee2e2',
    color: '#991b1b',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: 10
  },
  bottoneStampa: {
    padding: '12px 18px',
    border: 0,
    borderRadius: 10,
    background: '#16a34a',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  lista: {
    display: 'grid',
    gap: 14
  },
  vuoto: {
    background: '#ffffff',
    borderRadius: 14,
    padding: 20,
    color: '#6b7280',
    textAlign: 'center'
  },
  scadenza: {
    border: '2px solid #e5e7eb',
    borderRadius: 16,
    padding: 18,
    boxShadow: '0 6px 18px rgba(0,0,0,0.05)'
  },
  nomeScadenza: {
    margin: '0 0 6px 0',
    fontSize: 21
  },
  dataScadenza: {
    margin: '0 0 10px 0',
    color: '#4b5563'
  },
  noteScadenza: {
    margin: '0 0 10px 0',
    color: '#374151',
    background: '#f9fafb',
    padding: 10,
    borderRadius: 10
  },
  etichetta: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: 999,
    fontWeight: 'bold',
    fontSize: 14,
    background: '#e5e7eb'
  },
  rigaBottoniCard: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 16
  },
  bottonePiccolo: {
    padding: '9px 12px',
    border: 0,
    borderRadius: 9,
    background: '#e5e7eb',
    cursor: 'pointer'
  },
  bottoneElimina: {
    padding: '9px 12px',
    border: 0,
    borderRadius: 9,
    background: '#fee2e2',
    color: '#991b1b',
    cursor: 'pointer'
  },
  calendario: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 10px 25px rgba(0,0,0,0.08)'
  },
  testataCalendario: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20
  },
  titoloCalendario: {
    textTransform: 'capitalize',
    margin: 0,
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
    color: '#374151',
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
    background: '#ffffff',
    overflow: 'hidden'
  },
  numeroGiorno: {
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#111827'
  },
  eventoCalendario: {
    background: '#dbeafe',
    color: '#1e3a8a',
    padding: 6,
    borderRadius: 7,
    marginBottom: 5,
    fontSize: 13
  },
  noteCalendario: {
    marginTop: 4,
    fontSize: 12,
    color: '#1e40af'
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
    background: '#ffffff',
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
  nessunaStampa: {
    color: '#6b7280',
    fontStyle: 'italic'
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
  }
}

export default App