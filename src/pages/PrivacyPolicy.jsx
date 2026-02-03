import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Privacy Policy page - TC028
 * Placeholder until actual content is provided by product owner
 */
const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        
        <div className="prose prose-blue max-w-none">
          <p className="text-gray-600 mb-4">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Information We Collect</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Name, email address, and contact information</li>
              <li>Account credentials and authentication information</li>
              <li>Profile information and preferences</li>
              <li>Goals, tasks, and calendar data you create in the application</li>
              <li>Communication preferences and notification settings</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process and complete transactions</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Protect against fraud and abuse</li>
              <li>Analyze usage patterns and trends</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Information Sharing</h2>
            <p className="text-gray-700 leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share
              your information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mt-3">
              <li>With your consent or at your direction</li>
              <li>With service providers who perform services on our behalf</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Data Security</h2>
            <p className="text-gray-700 leading-relaxed">
              We take reasonable measures to help protect your personal information from loss, theft,
              misuse, unauthorized access, disclosure, alteration, and destruction. We use industry-standard
              encryption and security protocols to protect your data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed">
              We retain your personal information for as long as necessary to provide our services and
              fulfill the purposes outlined in this privacy policy. When you delete your account, we will
              delete your personal information, except where we are required to retain it for legal purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Your Rights</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Access and receive a copy of your personal data</li>
              <li>Correct inaccurate or incomplete personal data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to or restrict processing of your personal data</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Cookies and Tracking</h2>
            <p className="text-gray-700 leading-relaxed">
              We use cookies and similar tracking technologies to collect information about your browsing
              activities. You can control cookies through your browser settings, but disabling cookies may
              affect your ability to use certain features of our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Our service is not intended for children under 13 years of age. We do not knowingly collect
              personal information from children under 13. If you believe we have collected information
              from a child under 13, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Changes to This Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of any changes by
              posting the new privacy policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:privacy@practicalmanager.com" className="text-blue-600 hover:underline">
                privacy@practicalmanager.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 flex gap-6">
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Login
          </Link>
          <Link
            to="/terms-of-service"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
