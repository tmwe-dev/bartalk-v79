/**
 * RadioChat v8 — Privacy Policy Page
 * Informativa sulla privacy conforme al GDPR (Reg. UE 2016/679).
 */

interface PrivacyPolicyProps {
  onClose?: () => void;
}

export function PrivacyPolicy({ onClose }: PrivacyPolicyProps) {
  return (
    <div className="legal-page">
      {onClose && (
        <button className="legal-page__close" onClick={onClose}>&times;</button>
      )}
      <h1>Informativa sulla Privacy</h1>
      <p className="legal-page__updated">Ultimo aggiornamento: Maggio 2026</p>

      <section>
        <h2>1. Titolare del Trattamento</h2>
        <p>
          Il titolare del trattamento dei dati personali è il gestore della piattaforma RadioChat
          (di seguito "Titolare"). Per contattarci: <strong>privacy@radiochat.app</strong>
        </p>
      </section>

      <section>
        <h2>2. Dati Raccolti</h2>
        <p>Raccogliamo le seguenti categorie di dati:</p>
        <p>
          <strong>Dati di registrazione:</strong> indirizzo email e password (hash).
          <strong> Dati di utilizzo:</strong> messaggi inviati agli agenti AI, timestamp, provider utilizzato,
          conteggio token. <strong>Dati tecnici:</strong> indirizzo IP, tipo di browser, informazioni
          sul dispositivo. <strong>Dati di pagamento:</strong> gestiti interamente da Stripe Inc. —
          non memorizziamo numeri di carta di credito.
        </p>
      </section>

      <section>
        <h2>3. Finalità e Base Giuridica</h2>
        <p>
          Trattiamo i dati per: erogazione del servizio (art. 6.1.b GDPR — esecuzione contratto),
          miglioramento della piattaforma (art. 6.1.f — legittimo interesse), adempimenti fiscali
          e contabili (art. 6.1.c — obbligo legale), comunicazioni di servizio e marketing
          (art. 6.1.a — consenso, revocabile in qualsiasi momento).
        </p>
      </section>

      <section>
        <h2>4. Condivisione con Terzi</h2>
        <p>
          I dati possono essere condivisi con: fornitori di AI (OpenAI, Anthropic, Google, Groq) per
          l'elaborazione dei messaggi; Stripe per la gestione dei pagamenti; Supabase (Postgres)
          per l'hosting del database; Vercel per l'hosting dell'applicazione. Tutti i sub-responsabili
          operano in conformità al GDPR o hanno sottoscritto clausole contrattuali standard (SCC).
        </p>
      </section>

      <section>
        <h2>5. Conservazione dei Dati</h2>
        <p>
          I dati dell'account sono conservati per tutta la durata del rapporto contrattuale e per
          10 anni successivi alla cancellazione per obblighi fiscali. Le conversazioni AI sono
          conservate per 12 mesi, poi anonimizzate. I log di utilizzo sono conservati per 24 mesi.
        </p>
      </section>

      <section>
        <h2>6. Diritti dell'Interessato</h2>
        <p>
          Hai diritto di: accedere ai tuoi dati (art. 15), rettificarli (art. 16), cancellarli (art. 17),
          limitarne il trattamento (art. 18), portabilità (art. 20), opporti al trattamento (art. 21).
          Per esercitare i tuoi diritti scrivi a <strong>privacy@radiochat.app</strong>.
          Hai inoltre il diritto di proporre reclamo al Garante per la Protezione dei Dati Personali.
        </p>
      </section>

      <section>
        <h2>7. Sicurezza</h2>
        <p>
          Le chiavi API sono crittografate con AES-256-GCM. Le comunicazioni avvengono via HTTPS/TLS 1.3.
          Le password sono hashate con bcrypt. L'autenticazione utilizza JWT con firma HS256.
        </p>
      </section>

      <section>
        <h2>8. Trasferimento Extra-UE</h2>
        <p>
          Alcuni fornitori (OpenAI, Anthropic, Groq, Vercel) hanno sede negli USA. Il trasferimento
          è basato sulle Clausole Contrattuali Standard (SCC) approvate dalla Commissione UE o
          sull'EU-U.S. Data Privacy Framework.
        </p>
      </section>
    </div>
  );
}
