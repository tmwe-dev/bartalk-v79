/**
 * RadioChat v8 — Terms of Service
 * Condizioni generali di utilizzo del servizio.
 */

interface TermsOfServiceProps {
  onClose?: () => void;
}

export function TermsOfService({ onClose }: TermsOfServiceProps) {
  return (
    <div className="legal-page">
      {onClose && (
        <button className="legal-page__close" onClick={onClose}>&times;</button>
      )}
      <h1>Condizioni Generali di Servizio</h1>
      <p className="legal-page__updated">Ultimo aggiornamento: Maggio 2026</p>

      <section>
        <h2>1. Oggetto del Servizio</h2>
        <p>
          RadioChat è una piattaforma SaaS che consente agli utenti di interagire con agenti AI
          multipli (basati su modelli di OpenAI, Anthropic, Google e Groq) attraverso un'interfaccia
          web. Il servizio include chat multi-agente, corsi interattivi e strumenti di analisi.
        </p>
      </section>

      <section>
        <h2>2. Registrazione e Account</h2>
        <p>
          Per accedere al servizio è necessario creare un account con un indirizzo email valido.
          L'utente è responsabile della sicurezza delle proprie credenziali e di tutte le attività
          svolte tramite il proprio account. È vietata la condivisione delle credenziali con terzi.
        </p>
      </section>

      <section>
        <h2>3. Piani e Pagamenti</h2>
        <p>
          Il servizio è disponibile nei piani Free, Pro (€9.90/mese) e Unlimited (€24.90/mese).
          I pagamenti sono gestiti da Stripe. Gli abbonamenti si rinnovano automaticamente salvo
          cancellazione. Il rimborso è disponibile entro 14 giorni dal primo acquisto (diritto di
          recesso ai sensi del D.Lgs. 206/2005). I prezzi sono IVA inclusa per utenti consumer UE.
        </p>
      </section>

      <section>
        <h2>4. Uso Accettabile</h2>
        <p>
          L'utente si impegna a non utilizzare il servizio per: generare contenuti illegali,
          diffamatori o lesivi; tentare di aggirare i limiti di utilizzo; reverse engineering del
          software; attività di scraping automatizzato; condivisione non autorizzata di contenuti
          generati dall'AI che violino diritti di terzi.
        </p>
      </section>

      <section>
        <h2>5. Proprietà Intellettuale</h2>
        <p>
          L'utente mantiene la titolarità dei contenuti che inserisce nella piattaforma. I contenuti
          generati dagli agenti AI sono forniti "così come sono" — l'utente è responsabile della
          verifica e dell'utilizzo di tali contenuti. Il software RadioChat, il design e il marchio
          sono proprietà del Titolare.
        </p>
      </section>

      <section>
        <h2>6. Limitazione di Responsabilità</h2>
        <p>
          RadioChat è fornito "as is". Il Titolare non garantisce l'accuratezza dei contenuti generati
          dall'AI. La responsabilità massima è limitata all'importo pagato dall'utente nei 12 mesi
          precedenti. Il Titolare non è responsabile per danni indiretti, perdita di profitti o
          interruzioni del servizio causate da terzi (provider AI, hosting, etc.).
        </p>
      </section>

      <section>
        <h2>7. Cancellazione e Risoluzione</h2>
        <p>
          L'utente può cancellare il proprio account in qualsiasi momento dalle impostazioni.
          Il Titolare si riserva il diritto di sospendere o terminare account che violano le
          presenti condizioni, previa comunicazione (salvo casi di urgenza).
        </p>
      </section>

      <section>
        <h2>8. Foro Competente e Legge Applicabile</h2>
        <p>
          Le presenti condizioni sono regolate dalla legge italiana. Per le controversie con
          consumatori residenti nell'UE si applica il foro del consumatore (art. 66-bis Codice
          del Consumo). È disponibile la piattaforma ODR della Commissione UE per la risoluzione
          alternativa delle controversie.
        </p>
      </section>
    </div>
  );
}
