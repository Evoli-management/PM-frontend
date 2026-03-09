// src/components/teams/AdminRoleManager.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import organizationService from '../../services/organizationService';
import styles from './AdminRoleManager.module.css';

export const AdminRoleManager = ({ member, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleRoleChange = async (newRole) => {
    setLoading(true);
    setError(null);

    try {
      await organizationService.updateMemberRole(member.id, newRole);
      setIsOpen(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update role';
      setError(errorMsg);
      console.error('Failed to update role:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = member.role === 'admin';

  return (
    <div className={styles.container}>
      <button
        className={styles.toggleBtn}
        onClick={() => setIsOpen(!isOpen)}
        title={t("adminRoleManager.manageTitle")}
      >
        {isAdmin ? t("adminRoleManager.admin") : t("adminRoleManager.user")}
      </button>

      {isOpen && (
        <div className={styles.menu}>
          <div className={styles.header}>
            <strong>{member.firstName} {member.lastName}</strong>
            <button
              className={styles.closeBtn}
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            {!isAdmin ? (
              <button
                className={styles.promoteBtn}
                onClick={() => handleRoleChange('admin')}
                disabled={loading}
              >
                {loading ? t("adminRoleManager.promoting") : t("adminRoleManager.promoteToAdmin")}
              </button>
            ) : (
              <button
                className={styles.demoteBtn}
                onClick={() => handleRoleChange('user')}
                disabled={loading}
              >
                {loading ? t("adminRoleManager.demoting") : t("adminRoleManager.demoteToUser")}
              </button>
            )}
          </div>

          <small className={styles.hint}>
            {t("adminRoleManager.currentRole")} <strong>{isAdmin ? t("adminRoleManager.admin") : t("adminRoleManager.user")}</strong>
          </small>
        </div>
      )}
    </div>
  );
};
