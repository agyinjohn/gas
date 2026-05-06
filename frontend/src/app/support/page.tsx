'use client';
import { useState } from 'react';
import { 
  HelpCircle, MessageCircle, Phone, Mail, 
  Search, ChevronRight, Book, AlertCircle 
} from 'lucide-react';
import { Card, Button, Input } from '@/components/ui';

export default function SupportPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const faqCategories = [
    {
      id: 'orders',
      title: 'Orders & Delivery',
      icon: '📦',
      faqs: [
        {
          question: 'How long does delivery take?',
          answer: 'Standard delivery takes 30-60 minutes depending on your location and rider availability. You can track your order in real-time once a rider is assigned.'
        },
        {
          question: 'Can I schedule a delivery for later?',
          answer: 'Yes! You can schedule deliveries up to 7 days in advance. Just select your preferred date and time during checkout.'
        },
        {
          question: 'What if my cylinder is damaged?',
          answer: 'If you receive a damaged cylinder, please contact our support team immediately. We\'ll arrange a replacement at no extra cost.'
        }
      ]
    },
    {
      id: 'payments',
      title: 'Payments & Billing',
      icon: '💳',
      faqs: [
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept mobile money (MTN, Vodafone, AirtelTigo), credit/debit cards, and cash on delivery.'
        },
        {
          question: 'Is my payment information secure?',
          answer: 'Yes, all payments are processed securely through Paystack. We never store your card details on our servers.'
        },
        {
          question: 'Can I get a refund?',
          answer: 'Refunds are processed automatically for cancelled orders. For other refund requests, please contact our support team.'
        }
      ]
    },
    {
      id: 'account',
      title: 'Account & Profile',
      icon: '👤',
      faqs: [
        {
          question: 'How do I update my delivery address?',
          answer: 'Go to Profile > Saved Addresses to add, edit, or delete your delivery addresses. You can set a default address for faster checkout.'
        },
        {
          question: 'How do loyalty points work?',
          answer: 'Earn 1 point for every GH₵1 spent. Redeem 100 points for GH₵1 discount on future orders. Points never expire!'
        },
        {
          question: 'How do I refer friends?',
          answer: 'Share your unique referral code found in the Loyalty section. Both you and your friend get 200 points when they complete their first order.'
        }
      ]
    },
    {
      id: 'technical',
      title: 'Technical Issues',
      icon: '⚙️',
      faqs: [
        {
          question: 'The app is not working properly',
          answer: 'Try refreshing the page or clearing your browser cache. If the issue persists, please contact our technical support team.'
        },
        {
          question: 'I\'m not receiving notifications',
          answer: 'Check your notification settings in your profile. Make sure notifications are enabled for your browser or device.'
        },
        {
          question: 'My location is not accurate',
          answer: 'Ensure location services are enabled for your browser. You can also manually enter your address during checkout.'
        }
      ]
    }
  ];

  const contactOptions = [
    {
      title: 'Live Chat',
      description: 'Chat with our support team',
      icon: MessageCircle,
      action: 'Start Chat',
      available: true
    },
    {
      title: 'Phone Support',
      description: '+233 24 123 4567',
      icon: Phone,
      action: 'Call Now',
      available: true
    },
    {
      title: 'Email Support',
      description: 'support@gasgo.app',
      icon: Mail,
      action: 'Send Email',
      available: true
    }
  ];

  const filteredFAQs = faqCategories.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq => 
      searchTerm === '' || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.faqs.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white px-4 pt-12 pb-8">
        <div className="text-center mb-6">
          <HelpCircle className="w-12 h-12 mx-auto mb-3 text-white" />
          <h1 className="text-2xl font-bold mb-2">How can we help you?</h1>
          <p className="text-brand-100">Find answers to common questions or get in touch with our support team</p>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search for help..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white text-gray-900"
          />
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Get Help Now</h2>
          <div className="grid gap-3">
            {contactOptions.map((option, index) => {
              const IconComponent = option.icon;
              return (
                <Card key={index} className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-brand-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{option.title}</p>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {option.available && (
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                      <Button size="sm">
                        {option.action}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* FAQ Categories */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Frequently Asked Questions
            {searchTerm && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredFAQs.reduce((sum, cat) => sum + cat.faqs.length, 0)} results)
              </span>
            )}
          </h2>
          
          <div className="space-y-4">
            {filteredFAQs.map((category) => (
              <Card key={category.id}>
                <button
                  onClick={() => setActiveCategory(
                    activeCategory === category.id ? null : category.id
                  )}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{category.title}</h3>
                      <p className="text-sm text-gray-500">{category.faqs.length} questions</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                    activeCategory === category.id ? 'rotate-90' : ''
                  }`} />
                </button>
                
                {activeCategory === category.id && (
                  <div className="border-t border-gray-100">
                    {category.faqs.map((faq, index) => (
                      <div key={index} className="p-4 border-b border-gray-100 last:border-0">
                        <h4 className="font-medium text-gray-900 mb-2">{faq.question}</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Emergency Contact */}
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Emergency Support</h3>
              <p className="text-sm text-red-700 mb-3">
                For urgent issues like gas leaks, damaged cylinders, or safety concerns, 
                contact our emergency hotline immediately.
              </p>
              <Button size="sm" className="bg-red-600 hover:bg-red-700">
                <Phone className="w-4 h-4 mr-1" />
                Emergency: +233 24 999 0000
              </Button>
            </div>
          </div>
        </Card>

        {/* Additional Resources */}
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <Book className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Additional Resources</h3>
          </div>
          <div className="space-y-2">
            <button className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <p className="font-medium text-gray-900">Safety Guidelines</p>
              <p className="text-sm text-gray-600">Learn about safe handling of gas cylinders</p>
            </button>
            <button className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <p className="font-medium text-gray-900">Terms of Service</p>
              <p className="text-sm text-gray-600">Read our terms and conditions</p>
            </button>
            <button className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <p className="font-medium text-gray-900">Privacy Policy</p>
              <p className="text-sm text-gray-600">How we protect your data</p>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}