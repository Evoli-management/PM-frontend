import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Terms of Service page - TC028
 * Placeholder until actual content is provided by product owner
 */
const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        
        <div className="prose prose-blue max-w-none">
          <p className="text-gray-600 mb-4">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing and using Practical Manager, you accept and agree to be bound by the terms
              and provision of this agreement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Use License</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Permission is granted to temporarily access and use Practical Manager for personal or
              business use subject to the restrictions set in these terms.
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>You must not modify or copy the materials</li>
              <li>You must not use the materials for any commercial purpose</li>
              <li>You must not attempt to reverse engineer any software</li>
              <li>You must not remove any copyright or proprietary notations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. User Account</h2>
            <p className="text-gray-700 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account and password.
              You agree to accept responsibility for all activities that occur under your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Data Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Your use of Practical Manager is also governed by our{' '}
              <Link to="/privacy-policy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
              . Please review our Privacy Policy to understand our practices.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Disclaimer</h2>
            <p className="text-gray-700 leading-relaxed">
              The materials on Practical Manager are provided on an 'as is' basis. We make no warranties,
              expressed or implied, and hereby disclaim and negate all other warranties including, without
              limitation, implied warranties or conditions of merchantability, fitness for a particular
              purpose, or non-infringement of intellectual property.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Limitations</h2>
            <p className="text-gray-700 leading-relaxed">
              In no event shall Practical Manager or its suppliers be liable for any damages (including,
              without limitation, damages for loss of data or profit, or due to business interruption)
              arising out of the use or inability to use Practical Manager.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Revisions</h2>
            <p className="text-gray-700 leading-relaxed">
              We may revise these terms of service at any time without notice. By using Practical Manager,
              you are agreeing to be bound by the current version of these terms of service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Contact Information</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:support@practicalmanager.com" className="text-blue-600 hover:underline">
                support@practicalmanager.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
