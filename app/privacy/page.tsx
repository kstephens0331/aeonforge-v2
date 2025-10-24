export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Privacy Policy</h1>

        <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
          <p className="text-sm text-gray-500">Last Updated: {new Date().toLocaleDateString()}</p>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Introduction</h2>
            <p>
              AeonForge ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI assistant platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-4 mb-2">2.1 Account Information</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Email address</li>
              <li>Password (encrypted)</li>
              <li>Name (if provided)</li>
              <li>OAuth provider information (if using Google sign-in)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-4 mb-2">2.2 Usage Data</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Messages and conversations</li>
              <li>Projects and their settings</li>
              <li>Files and images uploaded</li>
              <li>Token usage statistics</li>
              <li>Model preferences</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-4 mb-2">2.3 Payment Information</h3>
            <p>
              Payment processing is handled by Stripe. We do not store your full credit card information. We receive transaction IDs, subscription status, and billing history from Stripe.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-4 mb-2">2.4 Technical Data</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Usage timestamps</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide and maintain the Service</li>
              <li>To process your conversations with AI models</li>
              <li>To manage your subscription and billing</li>
              <li>To send administrative information and updates</li>
              <li>To monitor usage and enforce limits</li>
              <li>To improve our Service and develop new features</li>
              <li>To detect and prevent abuse or policy violations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Data Sharing and Disclosure</h2>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-4 mb-2">4.1 Third-Party Services</h3>
            <p>We share data with the following third-party services necessary to operate AeonForge:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Supabase:</strong> Database and authentication (data stored in US/EU regions)</li>
              <li><strong>Anthropic (Claude):</strong> AI processing - your messages are sent to Claude API</li>
              <li><strong>Google (Gemini):</strong> AI processing - your messages are sent to Gemini API</li>
              <li><strong>Together.ai:</strong> AI processing, embeddings, image generation</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Resend:</strong> Email delivery</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-4 mb-2">4.2 Legal Requirements</h3>
            <p>We may disclose your information if required by law, subpoena, or to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Comply with legal obligations</li>
              <li>Protect our rights and property</li>
              <li>Prevent fraud or abuse</li>
              <li>Protect user safety</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-4 mb-2">4.3 Content Moderation</h3>
            <p>
              Flagged content may be reviewed by our moderation team. Content that violates our policies may be shared with law enforcement if necessary.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Active Accounts:</strong> Data retained as long as account is active</li>
              <li><strong>Deleted Accounts:</strong> Most data deleted within 30 days; some metadata retained for legal/billing purposes</li>
              <li><strong>Backups:</strong> Backups may retain data for up to 90 days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Data Security</h2>
            <p>We implement industry-standard security measures including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Encryption in transit (TLS/SSL)</li>
              <li>Encryption at rest (database encryption)</li>
              <li>Row-level security policies</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
            </ul>
            <p className="mt-2">
              However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Your Rights</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Access:</strong> Request a copy of your data</li>
              <li><strong>Correction:</strong> Update inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data</li>
              <li><strong>Export:</strong> Receive your data in a portable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing emails</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, contact us at{' '}
              <a href="mailto:info@stephenscode.dev" className="text-primary-600 hover:underline">
                info@stephenscode.dev
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Children's Privacy</h2>
            <p>
              AeonForge is not intended for users under 13 years of age (or 16 in the EU). We do not knowingly collect data from children. If you believe a child has provided us with personal information, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. International Data Transfers</h2>
            <p>
              Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Cookies and Tracking</h2>
            <p>We use essential cookies for:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Authentication and session management</li>
              <li>Storing user preferences</li>
              <li>Security features</li>
            </ul>
            <p className="mt-2">We do not use advertising or tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">11. AI Training Data</h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4">
              <p className="font-semibold">Important Information:</p>
              <p className="mt-2">
                Your conversations may be sent to third-party AI providers (Claude, Gemini, Together.ai) for processing. These providers may use conversations to improve their models according to their own privacy policies.
              </p>
              <p className="mt-2">
                We recommend not sharing sensitive personal information in conversations.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">12. Changes to Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through the Service. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">13. Contact Us</h2>
            <p>
              For privacy-related questions or to exercise your rights:
            </p>
            <p className="mt-2">
              Email:{' '}
              <a href="mailto:info@stephenscode.dev" className="text-primary-600 hover:underline">
                info@stephenscode.dev
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
