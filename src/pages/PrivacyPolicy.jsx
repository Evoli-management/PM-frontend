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
        
        <div className="text-gray-700 leading-relaxed space-y-4">
          <section className="mb-8">
            <p className="text-gray-700 mb-4">
              Your privacy is important to us. We are committed to protecting the information you provide
              to us. We only collect, use and disclose personal information to the extent allowed by
              applicable law. For the purpose of this document, "personal information" is information that
              can be used to distinguish or trace your identity, such as your name, email address,
              physical address, telephone number, or IP address.
            </p>
            <p className="text-gray-700 mb-4">
              We are located in Slovenia and operate subject to the laws of the Republic of Slovenia.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Children Under 18</h2>
            <p className="text-gray-700">
              This service is not intended for children under 18 years of age. If you are under 18 years
              of age, you can only use this service with parental consent. If you provide us with
              personal information and you are under 18, we assume that you have parental or legal
              guardian consent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Information You Provide To Us</h2>
            <p className="text-gray-700 mb-3">
              We collect the information you provide to us, including:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Your name</li>
              <li>Your email address</li>
              <li>Your photos and pictures</li>
              <li>Profile information</li>
              <li>Any information you share or upload</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Information We Collect Automatically</h2>
            <p className="text-gray-700 mb-3">
              We automatically collect certain types of information from your device or usage:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Your location (country/state)</li>
              <li>Your IP address</li>
              <li>Your browser type and version</li>
              <li>Your posts and activities</li>
              <li>Metadata associated with your content</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">No Cookies</h2>
            <p className="text-gray-700">
              We do not use cookies or similar technologies to track your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">How We Use Your Information</h2>
            <p className="text-gray-700 mb-3">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>To provide and improve our service</li>
              <li>To send you administrative information and updates</li>
              <li>To respond to your inquiries and support requests</li>
              <li>To monitor usage and analytics</li>
              <li>To protect against fraud and abuse</li>
              <li>For any other purpose you authorize</li>
            </ul>
            <p className="text-gray-700 mt-3">
              Your posts and activities may be visible to others within your organization. Strokes
              assessment data may be publicly visible.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Information Disclosure</h2>
            <p className="text-gray-700 mb-3">
              We will only disclose your personal information:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>With your consent</li>
              <li>To service providers who assist us in operating our service</li>
              <li>When required by law or legal process</li>
              <li>To protect the rights, privacy, safety, or property of our users or the public</li>
              <li>Only the minimum information necessary to fulfill these obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Invitations and Email</h2>
            <p className="text-gray-700">
              If you choose to invite others to use our service, we may send them invitations or emails
              on your behalf. We will use their email addresses only for this purpose.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Fraud Prevention</h2>
            <p className="text-gray-700">
              We may use your information to prevent fraud, abuse, and other harmful activities.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Editing Your Account</h2>
            <p className="text-gray-700">
              You can edit or update your account information at any time through your profile settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Data Deletion</h2>
            <p className="text-gray-700">
              When you delete your account, we will purge your personal information within 90 days,
              except where we are required to retain it for legal purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Changes to This Policy</h2>
            <p className="text-gray-700">
              We may update this privacy policy from time to time. We will notify you of significant
              changes by posting the updated policy and changing the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact Us</h2>
            <p className="text-gray-700">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:privacy@evoliteamplus.com" className="text-blue-600 hover:underline">
                privacy@evoliteamplus.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 flex gap-6">
          <Link
            to="/registration"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Registration
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
