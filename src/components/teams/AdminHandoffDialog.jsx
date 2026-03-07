// src/components/teams/AdminHandoffDialog.jsx
import { useState, useEffect } from 'react';
import { useAdminHandoff } from '../../hooks/useAdminHandoff';
import { useTranslation } from 'react-i18next';
import styles from './AdminHandoffDialog.module.css';

export const AdminHandoffDialog = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [step, setStep] = useState('select'); // 'select' or 'confirm'
  const { loadMembers, promoteToAdmin, leaveOrganization, members, loading, error, setError } =
    useAdminHandoff();

  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen]);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const handlePromoteAndLeave = async () => {
    setError(null);
    try {
      // First promote the selected member to admin
      await promoteToAdmin(selectedMemberId);

      // Then leave the organization
      await leaveOrganization();

      if (onSuccess) {
        onSuccess();
      }

      handleClose();
    } catch (err) {
      console.error('Failed to complete admin handoff:', err);
    }
  };

  const handleClose = () => {
    setSelectedMemberId('');
    setStep('select');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const nonAdminMembers = members.filter((m) => m.role !== 'admin');

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h3>{t("adminHandoff.title")}</h3>
          <button className={styles.closeBtn} onClick={handleClose}>
            ✕
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {step === 'select' ? (
          <div className={styles.content}>
            <p className={styles.description}>
              {t("adminHandoff.description")}
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="member-select">{t("adminHandoff.selectLabel")}</label>
              <select
                id="member-select"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className={styles.select}
              >
                <option value="">{t("adminHandoff.selectPlaceholder")}</option>
                {nonAdminMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName} ({member.email})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={handleClose}>
                {t("adminHandoff.cancel")}
              </button>
              <button
                className={styles.nextBtn}
                onClick={() => setStep('confirm')}
                disabled={!selectedMemberId || loading}
              >
                {loading ? t("adminHandoff.promoting") : t("adminHandoff.next")}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.content}>
            <div className={styles.confirmBox}>
              <h4>{t("adminHandoff.confirmTitle")}</h4>
              <p>
                {t("adminHandoff.confirmText", { name: `${selectedMember?.firstName} ${selectedMember?.lastName}` })}
              </p>
              <p className={styles.warning}>
                {t("adminHandoff.warning")}
              </p>
            </div>

            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={() => setStep('select')}>
                {t("adminHandoff.back")}
              </button>
              <button
                className={styles.leaveBtn}
                onClick={handlePromoteAndLeave}
                disabled={loading}
              >
                {loading ? t("adminHandoff.processing") : t("adminHandoff.confirmLeave")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
