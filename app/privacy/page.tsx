export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            Last Updated: November 4, 2025
          </p>

          <div className="prose prose-blue max-w-none space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Introduction</h2>
              <p>
                Welcome to Rentify ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our property rental platform and services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2.1 Personal Information</h3>
              <p>We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Name and contact information (email address, phone number)</li>
                <li>Account credentials (username, password)</li>
                <li>Profile information (bio, profile picture)</li>
                <li>Address and location information</li>
                <li>Payment and billing information</li>
                <li>Communication preferences</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2.2 Property Information</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Property listings and descriptions</li>
                <li>Property photos and videos</li>
                <li>Rental prices and availability</li>
                <li>Property location and amenities</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2.3 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage data (pages viewed, links clicked, time spent)</li>
                <li>Location data (with your permission)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2.4 Third-Party Information</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Information from Facebook Login (name, email, profile picture)</li>
                <li>Information from payment processors</li>
                <li>Public records and property data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. How We Use Your Information</h2>
              <p>We use the collected information for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>To provide, maintain, and improve our services</li>
                <li>To process transactions and send related information</li>
                <li>To facilitate property listings and rental agreements</li>
                <li>To communicate with you about your account and services</li>
                <li>To send marketing and promotional materials (with your consent)</li>
                <li>To respond to your inquiries and provide customer support</li>
                <li>To detect, prevent, and address fraud and security issues</li>
                <li>To comply with legal obligations</li>
                <li>To personalize your experience and provide recommendations</li>
                <li>To analyze usage patterns and improve our platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Information Sharing and Disclosure</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">We may share your information with:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Property Owners and Renters:</strong> When you inquire about or rent a property</li>
                <li><strong>Service Providers:</strong> Third-party vendors who assist in providing our services</li>
                <li><strong>Payment Processors:</strong> To process your transactions securely</li>
                <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
              </ul>

              <p className="mt-4">
                <strong>We do not sell your personal information to third parties.</strong>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational security measures to protect your personal information, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security assessments and updates</li>
                <li>Employee training on data protection</li>
                <li>Protection against XSS, CSRF, and other security threats</li>
              </ul>
              <p className="mt-4">
                However, no method of transmission over the Internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Your Rights and Choices</h2>
              <p>You have the following rights regarding your personal information:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Data Portability:</strong> Receive your data in a structured format</li>
                <li><strong>Object:</strong> Object to certain processing activities</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, please visit our <a href="/data-deletion" className="text-blue-600 hover:text-blue-700 underline">Data Deletion page</a> or contact us at privacy@rentify.com.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Cookies and Tracking Technologies</h2>
              <p>
                We use cookies and similar tracking technologies to enhance your experience. You can control cookies through your browser settings. Types of cookies we use:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><strong>Essential Cookies:</strong> Required for the platform to function</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how you use our services</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy. We may retain certain information after account deletion for:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Legal compliance and record-keeping requirements</li>
                <li>Dispute resolution and fraud prevention</li>
                <li>Enforcing our terms and conditions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Children's Privacy</h2>
              <p>
                Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">11. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on our platform and updating the "Last Updated" date. Your continued use of our services after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">12. Contact Us</h2>
              <p>
                If you have questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact us:
              </p>
              <div className="mt-4 bg-gray-50 p-6 rounded-lg">
                <p><strong>Email:</strong> privacy@rentify.com</p>
                <p><strong>Address:</strong> Rentify Inc., Data Protection Officer</p>
                <p><strong>Phone:</strong> +1 (555) 123-4567</p>
              </div>
            </section>

            <section className="mt-12 p-6 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Your Privacy Matters</h3>
              <p className="text-blue-800">
                At Rentify, we are committed to transparency and protecting your privacy. If you have any questions or concerns about how we handle your data, please don't hesitate to reach out to us.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
