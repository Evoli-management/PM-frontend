// src/components/teams/AdminHandoffDialog.jsx
import { useState, useEffect } from 'react';
import { useAdminHandoff } from '../../hooks/useAdminHandoff';
import styles from './AdminHandoffDialog.module.css';

export const AdminHandoffDialog = ({ isOpen, onClose, onSuccess }) => {
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
          <h3>Leave Organization</h3>
          <button className={styles.closeBtn} onClick={handleClose}>
            ✕
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {step === 'select' ? (
          <div className={styles.content}>
            <p className={styles.description}>
              You are the sole admin of this organization. Before you can leave, you must promote
              another member to admin.
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="member-select">Select a member to promote to admin:</label>
              <select
                id="member-select"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className={styles.select}
              >
                <option value="">-- Select a member --</option>
                {nonAdminMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName} ({member.email})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={handleClose}>
                Cancel
              </button>
              <button
                className={styles.nextBtn}
                onClick={() => setStep('confirm')}
                disabled={!selectedMemberId || loading}
              >
                {loading ? 'Promoting...' : 'Next'}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.content}>
            <div className={styles.confirmBox}>
              <h4>Confirm Admin Handoff</h4>
              <p>
                You are about to promote <strong>{selectedMember?.firstName} {selectedMember?.lastName}</strong> to admin and leave the organization.
              </p>
              <p className={styles.warning}>
                ⚠️ This action cannot be undone. The new admin will have full control over the
                organization.
              </p>
            </div>

            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={() => setStep('select')}>
                Back
              </button>
              <button
                className={styles.leaveBtn}
                onClick={handlePromoteAndLeave}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm and Leave'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
