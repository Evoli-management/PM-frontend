// src/components/teams/PendingJoinRequests.jsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTeamJoinRequests } from '../../hooks/useTeamJoinRequests';
import styles from './PendingJoinRequests.module.css';

export const PendingJoinRequests = ({ teamId, teamName }) => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const { getPendingRequests, reviewRequest, loading, error } = useTeamJoinRequests();
  const [rejectionReasons, setRejectionReasons] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadRequests();
    }
  }, [isOpen]);

  const loadRequests = async () => {
    try {
      const data = await getPendingRequests(teamId);
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await reviewRequest(teamId, requestId, 'approved');
      await loadRequests();
    } catch (err) {
      console.error('Failed to approve request:', err);
    }
  };

  const handleReject = async (requestId) => {
    const reason = rejectionReasons[requestId] || '';
    try {
      await reviewRequest(teamId, requestId, 'rejected', reason);
      setRejectionReasons((prev) => {
        const updated = { ...prev };
        delete updated[requestId];
        return updated;
      });
      await loadRequests();
    } catch (err) {
      console.error('Failed to reject request:', err);
    }
  };

  if (!isOpen) {
    return (
      <button
        className={styles.toggleBtn}
        onClick={() => setIsOpen(true)}
      >
        {t("pendingJoinRequests.toggleBtn", { n: requests.length })}
      </button>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4>{t("pendingJoinRequests.title", { name: teamName })}</h4>
        <button
          className={styles.closeBtn}
          onClick={() => setIsOpen(false)}
        >
          ✕
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {requests.length === 0 ? (
        <p className={styles.empty}>{t("pendingJoinRequests.noRequests")}</p>
      ) : (
        <div className={styles.requestsList}>
          {requests.map((request) => (
            <div key={request.id} className={styles.requestCard}>
              <div className={styles.userInfo}>
                <strong>
                  {request.userFirstName} {request.userLastName}
                </strong>
                <small>{request.userEmail}</small>
              </div>

              {request.message && (
                <div className={styles.message}>
                  <strong>{t("pendingJoinRequests.messageLabel")}</strong>
                  <p>{request.message}</p>
                </div>
              )}

              <div className={styles.timestamp}>
                {t("pendingJoinRequests.requested", { date: new Date(request.createdAt).toLocaleDateString() })}
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.approveBtn}
                  onClick={() => handleApprove(request.id)}
                  disabled={loading}
                >
                  {t("pendingJoinRequests.approve")}
                </button>

                <div className={styles.rejectGroup}>
                  <input
                    type="text"
                    placeholder={t("pendingJoinRequests.rejectPlaceholder")}
                    value={rejectionReasons[request.id] || ''}
                    onChange={(e) =>
                      setRejectionReasons((prev) => ({
                        ...prev,
                        [request.id]: e.target.value,
                      }))
                    }
                    className={styles.rejectInput}
                  />
                  <button
                    className={styles.rejectBtn}
                    onClick={() => handleReject(request.id)}
                    disabled={loading}
                  >
                    {t("pendingJoinRequests.reject")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
