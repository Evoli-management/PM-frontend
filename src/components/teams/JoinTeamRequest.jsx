// src/components/teams/JoinTeamRequest.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTeamJoinRequests } from '../../hooks/useTeamJoinRequests';
import styles from './JoinTeamRequest.module.css';

export const JoinTeamRequest = ({ teamId, teamName, onSuccess }) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { requestJoinTeam, loading, error, setError } = useTeamJoinRequests();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      await requestJoinTeam(teamId, message);
      setSubmitted(true);
      setMessage('');

      if (onSuccess) {
        onSuccess();
      }

      // Auto-hide success message after 5 seconds
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error('Failed to submit join request:', err);
    }
  };

  if (submitted) {
    return (
      <div className={styles.successMessage}>
        <h4>{t("joinTeamRequest.successTitle")}</h4>
        <p>{t("joinTeamRequest.successText", { name: teamName })}</p>
      </div>
    );
  }

  return (
    <div className={styles.requestForm}>
      <h4>{t("joinTeamRequest.requestTitle", { name: teamName })}</h4>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="message">{t("joinTeamRequest.messageLabel")}</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("joinTeamRequest.messagePlaceholder")}
            maxLength={500}
            rows={4}
            className={styles.textarea}
          />
          <small>{message.length}/500</small>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button
            type="submit"
            disabled={loading}
            className={styles.submitBtn}
          >
            {loading ? t("joinTeamRequest.sending") : t("joinTeamRequest.send")}
          </button>
        </div>
      </form>
    </div>
  );
};
