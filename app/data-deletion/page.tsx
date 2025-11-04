"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, CheckCircle2, Trash2, Shield, Info } from 'lucide-react'

export default function DataDeletion() {
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    // Validation
    if (!email) {
      setError('Please provide your email address')
      setIsSubmitting(false)
      return
    }

    try {
      // TODO: Implement actual data deletion request API
      // const response = await fetch('/api/data-deletion', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, reason })
      // })

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      setSubmitSuccess(true)
      setEmail('')
      setReason('')
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(false)
      }, 5000)
    } catch (err) {
      setError('Failed to submit request. Please try again or contact support.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Data Deletion Request
            </h1>
          </div>
          
          <p className="text-sm text-gray-500 mb-8">
            Last Updated: November 4, 2025
          </p>

          <div className="prose prose-red max-w-none space-y-6 text-gray-700">
            {/* Information Section */}
            <section>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 flex gap-4">
                <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Your Right to Data Deletion</h3>
                  <p className="text-blue-800 text-sm">
                    Under data protection regulations (GDPR, CCPA, etc.), you have the right to request deletion of your personal data. We are committed to honoring your privacy rights and will process your request promptly.
                  </p>
                </div>
              </div>
            </section>

            {/* What Gets Deleted */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">What Will Be Deleted</h2>
              <p>When you submit a data deletion request, we will delete:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Your account information (username, email, password)</li>
                <li>Profile data (bio, profile picture, preferences)</li>
                <li>Contact information (phone number, address)</li>
                <li>Property listings and associated data</li>
                <li>Messages and communication history</li>
                <li>Search history and preferences</li>
                <li>Payment information (except as required by law)</li>
                <li>Any other personal data associated with your account</li>
              </ul>
            </section>

            {/* What May Be Retained */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Data We May Retain</h2>
              <p>We may retain certain information for legitimate business purposes or legal requirements:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><strong>Transaction Records:</strong> Financial records for tax and accounting purposes</li>
                <li><strong>Legal Compliance:</strong> Data required by law or for ongoing legal proceedings</li>
                <li><strong>Fraud Prevention:</strong> Information needed to prevent fraud or abuse</li>
                <li><strong>Aggregated Data:</strong> Anonymous, aggregated data for analytics</li>
                <li><strong>Backup Systems:</strong> Data in backup systems will be deleted within 90 days</li>
              </ul>
            </section>

            {/* Processing Timeline */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Processing Timeline</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                    <div>
                      <strong>Request Submission:</strong> Submit your deletion request using the form below
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                    <div>
                      <strong>Identity Verification (24-48 hours):</strong> We'll verify your identity to prevent unauthorized requests
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                    <div>
                      <strong>Data Deletion (7-30 days):</strong> We'll permanently delete your data from active systems
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
                    <div>
                      <strong>Confirmation:</strong> You'll receive an email confirming deletion is complete
                    </div>
                  </li>
                </ul>
              </div>
            </section>

            {/* Important Considerations */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Before You Request Deletion</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex gap-4">
                  <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-yellow-900 mb-2">Important Considerations</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-800">
                      <li>Data deletion is <strong>permanent and cannot be undone</strong></li>
                      <li>You will lose access to your account and all associated data</li>
                      <li>Active property listings will be removed immediately</li>
                      <li>Ongoing rental agreements should be completed first</li>
                      <li>You may download your data before deletion by contacting support</li>
                      <li>Creating a new account with the same email may not be possible immediately</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Deletion Request Form */}
            <section className="mt-12">
              <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-6 h-6 text-red-600" />
                  <h2 className="text-2xl font-semibold text-gray-900">Submit Deletion Request</h2>
                </div>

                {submitSuccess ? (
                  <div className="py-8 space-y-4 animate-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-green-900 mb-2">Request Submitted Successfully!</h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        We've received your data deletion request. You'll receive a verification email within 24-48 hours. Please check your email and follow the instructions to complete the process.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-700 font-semibold">
                        Email Address <span className="text-red-600">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                        disabled={isSubmitting}
                        required
                      />
                      <p className="text-sm text-gray-600">
                        Enter the email address associated with your Rentify account
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reason" className="text-gray-700 font-semibold">
                        Reason for Deletion (Optional)
                      </Label>
                      <Textarea
                        id="reason"
                        placeholder="Please share why you're leaving (this helps us improve)"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="border-gray-300 focus:border-red-500 focus:ring-red-500 min-h-[100px]"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          className="mt-1"
                          disabled={isSubmitting}
                        />
                        <span className="text-sm text-gray-700">
                          I understand that this action is permanent and cannot be undone. I confirm that I want to delete my account and all associated data from Rentify.
                        </span>
                      </label>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Submitting Request...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-5 h-5 mr-2" />
                          Submit Deletion Request
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-gray-500">
                      By submitting this request, you agree to our <a href="/terms" className="text-red-600 hover:text-red-700 underline">Terms of Service</a> and <a href="/privacy" className="text-red-600 hover:text-red-700 underline">Privacy Policy</a>
                    </p>
                  </form>
                )}
              </div>
            </section>

            {/* Alternative Options */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Alternative Options</h2>
              <p className="mb-4">Before deleting your account, consider these alternatives:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Deactivate Account</h3>
                  <p className="text-sm text-gray-700">
                    Temporarily disable your account without deleting data. You can reactivate anytime.
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Update Privacy Settings</h3>
                  <p className="text-sm text-gray-700">
                    Control what data is collected and how it's used in your account settings.
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Download Your Data</h3>
                  <p className="text-sm text-gray-700">
                    Export a copy of your data before deleting. Contact support for assistance.
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Contact Support</h3>
                  <p className="text-sm text-gray-700">
                    Discuss your concerns with our team. We may be able to help without deletion.
                  </p>
                </div>
              </div>
            </section>

            {/* Contact Section */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Need Help?</h2>
              <p className="mb-4">
                If you have questions about data deletion or need assistance, please contact us:
              </p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p><strong>Email:</strong> privacy@rentify.com</p>
                <p><strong>Subject Line:</strong> "Data Deletion Request - [Your Email]"</p>
                <p><strong>Phone:</strong> +1 (555) 123-4567</p>
                <p className="mt-3 text-sm text-gray-600">
                  Our privacy team typically responds within 24-48 hours.
                </p>
              </div>
            </section>

            <section className="mt-12 p-6 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">We're Sorry to See You Go</h3>
              <p className="text-blue-800">
                Your privacy and trust are important to us. If there's anything we can do to improve your experience or address your concerns, please let us know before you go.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
