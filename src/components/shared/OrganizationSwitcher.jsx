import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Building2, Plus, Check } from 'lucide-react';

export default function OrganizationSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

  // Fetch organizations on mount
  useEffect(() => {
    loadOrganizations();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Import organization service
      const organizationService = await import('../../services/organizationService').then(m => m.default);
      
      // Get user's organizations
      const orgs = await organizationService.getUserOrganizations();
      setOrganizations(Array.isArray(orgs) ? orgs : []);
      
      // Get current organization (stored in context or localStorage)
      const currentId = localStorage.getItem('currentOrganizationId');
      const current = orgs.find(o => o.id === currentId) || orgs[0];
      setCurrentOrg(current);
      
      if (current) {
        localStorage.setItem('currentOrganizationId', current.id);
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchOrg = (org) => {
    setCurrentOrg(org);
    localStorage.setItem('currentOrganizationId', org.id);
    setIsOpen(false);
    
    // Dispatch event for context update
    window.dispatchEvent(new CustomEvent('organizationChanged', { detail: org }));
    
    // Reload dashboard with new org context
    window.location.hash = '#/dashboard';
  };

  // Show nothing if no organizations
  if (!organizations || organizations.length < 2) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md hover:bg-gray-100 transition-colors border border-gray-200"
        title="Switch organization"
      >
        <Building2 className="w-4 h-4 text-gray-600" />
        <span className="text-gray-700 font-medium truncate max-w-[120px]">
          {currentOrg?.name || 'Organization'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-[160] py-1">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Organizations
            </p>
          </div>

          {/* Organizations list */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                Loading organizations...
              </div>
            ) : error ? (
              <div className="px-3 py-4 text-center text-sm text-red-600">
                {error}
              </div>
            ) : organizations.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                No organizations found
              </div>
            ) : (
              organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitchOrg(org)}
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between hover:bg-blue-50 transition-colors ${
                    currentOrg?.id === org.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className={`truncate ${currentOrg?.id === org.id ? 'font-semibold text-blue-900' : 'text-gray-700'}`}>
                      {org.name}
                    </span>
                  </div>
                  {currentOrg?.id === org.id && (
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Create new org button */}
          <button
            onClick={() => {
              setIsOpen(false);
              window.location.hash = '#/profile?tab=organizations';
            }}
            className="w-full text-left px-3 py-2.5 text-sm text-blue-600 hover:bg-gray-50 border-t border-gray-200 flex items-center gap-2 font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Organization
          </button>
        </div>
      )}
    </div>
  );
}
