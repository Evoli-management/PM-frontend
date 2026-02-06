import React from 'react';
import { X } from 'lucide-react';

const PrivacyPolicyModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="text-gray-700 leading-relaxed space-y-4">
            <section>
              <p>
                Your privacy is important to us. We are committed to protecting the information you provide
                to us. We only collect, use and disclose personal information to the extent allowed by
                applicable law. For the purpose of this document, "personal information" is information that
                can be used to distinguish or trace your identity, such as your name, email address,
                physical address, telephone number, or IP address.
              </p>
              <p>
                We are located in Slovenia and operate subject to the laws of the Republic of Slovenia.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Children Under 18</h2>
              <p>
                This service is not intended for children under 18 years of age. If you are under 18 years
                of age, you can only use this service with parental consent. If you provide us with
                personal information and you are under 18, we assume that you have parental or legal
                guardian consent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Information You Provide To Us</h2>
              <p className="mb-3">
                We collect the information you provide to us, including:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Your name</li>
                <li>Your email address</li>
                <li>Your photos and pictures</li>
                <li>Profile information</li>
                <li>Any information you share or upload</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Information We Collect Automatically</h2>
              <p className="mb-3">
                We automatically collect certain types of information from your device or usage:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Your location (country/state)</li>
                <li>Your IP address</li>
                <li>Your browser type and version</li>
                <li>Your posts and activities</li>
                <li>Metadata associated with your content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">No Cookies</h2>
              <p>
                We do not use cookies or similar technologies to track your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">How We Use Your Information</h2>
              <p className="mb-3">
                We use the information we collect for the following purposes:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>To provide and improve our service</li>
                <li>To send you administrative information and updates</li>
                <li>To respond to your inquiries and support requests</li>
                <li>To monitor usage and analytics</li>
                <li>To protect against fraud and abuse</li>
                <li>For any other purpose you authorize</li>
              </ul>
              <p className="mt-3">
                Your posts and activities may be visible to others within your organization. Strokes
                assessment data may be publicly visible.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Information Disclosure</h2>
              <p className="mb-3">
                We will only disclose your personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>With your consent</li>
                <li>To service providers who assist us in operating our service</li>
                <li>When required by law or legal process</li>
                <li>To protect the rights, privacy, safety, or property of our users or the public</li>
                <li>Only the minimum information necessary to fulfill these obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Invitations and Email</h2>
              <p>
                If you choose to invite others to use our service, we may send them invitations or emails
                on your behalf. We will use their email addresses only for this purpose.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Fraud Prevention</h2>
              <p>
                We may use your information to prevent fraud, abuse, and other harmful activities.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Editing Your Account</h2>
              <p>
                You can edit or update your account information at any time through your profile settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Data Deletion</h2>
              <p>
                When you delete your account, we will purge your personal information within 90 days,
                except where we are required to retain it for legal purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Changes to This Policy</h2>
              <p>
                We may update this privacy policy from time to time. We will notify you of significant
                changes by posting the updated policy and changing the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:privacy@evoliteamplus.com" className="text-blue-600 hover:underline">
                  privacy@evoliteamplus.com
                </a>
              </p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;
