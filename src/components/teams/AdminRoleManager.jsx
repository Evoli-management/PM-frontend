// src/components/teams/AdminRoleManager.jsx
import { useState } from 'react';
import organizationService from '../../services/organizationService';
import styles from './AdminRoleManager.module.css';

export const AdminRoleManager = ({ member, onSuccess }) => {
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
        title="Manage admin role"
      >
        {isAdmin ? 'Admin' : 'User'}
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
                {loading ? 'Promoting...' : 'Promote to Admin'}
              </button>
            ) : (
              <button
                className={styles.demoteBtn}
                onClick={() => handleRoleChange('user')}
                disabled={loading}
              >
                {loading ? 'Demoting...' : 'Demote to User'}
              </button>
            )}
          </div>

          <small className={styles.hint}>
            Current role: <strong>{isAdmin ? 'Admin' : 'User'}</strong>
          </small>
        </div>
      )}
    </div>
  );
};
