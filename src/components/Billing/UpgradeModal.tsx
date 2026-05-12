/**
 * BarTalk v8 — Upgrade Modal
 * Modal che appare quando l'utente free raggiunge il limite messaggi.
 */

import { useState } from 'react';
import { useBillingContext } from '../../context/BillingContext';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Messaggi usati / limite per contesto */
  messagesUsed?: number;
  messagesLimit?: number;
}

export function UpgradeModal({
  isOpen,
  onClose,
  messagesUsed,
  messagesLimit,
}: UpgradeModalProps) {
  const { openCheckout } = useBillingContext();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await openCheckout('pro');
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="upgrade-modal-overlay" onClick={onClose}>
      <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <button className="upgrade-modal__close" onClick={onClose}>
          &times;
        </button>

        <div className="upgrade-modal__icon">🚀</div>

        <h2 className="upgrade-modal__title">Hai raggiunto il limite</h2>

        <p className="upgrade-modal__desc">
          {messagesUsed !== undefined && messagesLimit !== undefined
            ? `Hai usato tutti i ${messagesLimit} messaggi di oggi.`
            : 'Hai raggiunto il limite di messaggi del piano gratuito.'}
          {' '}Passa a Pro per continuare a chattare senza limiti.
        </p>

        <div className="upgrade-modal__benefits">
          <div className="upgrade-modal__benefit">
            <span>💬</span> Messaggi illimitati ogni giorno
          </div>
          <div className="upgrade-modal__benefit">
            <span>📚</span> Accesso completo ai corsi
          </div>
          <div className="upgrade-modal__benefit">
            <span>⚡</span> Priorità nelle risposte AI
          </div>
          <div className="upgrade-modal__benefit">
            <span>📧</span> Supporto prioritario via email
          </div>
        </div>

        <button
          className="upgrade-modal__cta"
          onClick={handleUpgrade}
          disabled={loading}
        >
          {loading ? 'Reindirizzamento a Stripe…' : 'Passa a Pro — €9.90/mese'}
        </button>

        <button className="upgrade-modal__skip" onClick={onClose}>
          Non ora
        </button>
      </div>
    </div>
  );
}
