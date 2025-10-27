import { Card, CardContent } from '@/shared/components/ui/Card';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

export function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQ[] = [
    {
      category: 'Orders',
      question: 'How do I track my order?',
      answer:
        'You can track your order by going to the Orders page in your account ' +
        'dashboard. Each order has a tracking number that you can use to monitor its status.',
    },
    {
      category: 'Orders',
      question: 'Can I cancel my order?',
      answer:
        'Orders can be cancelled within 24 hours of placement if they ' +
        'haven\'t been shipped yet. Contact the seller directly or use the cancel button on your order page.',
    },
    {
      category: 'Shipping',
      question: 'What are the shipping options?',
      answer:
        'Shipping options vary by seller and location. ' +
        'Standard shipping typically takes 5-7 business days, ' +
        'while express shipping takes 2-3 business days.',
    },
    {
      category: 'Returns',
      question: 'What is your return policy?',
      answer:
        'Most items can be returned within 30 days of delivery. ' +
        'Items must be in original condition with tags attached. ' +
        'Check individual seller policies for specific details.',
    },
    {
      category: 'Payment',
      question: 'What payment methods do you accept?',
      answer:
        'We accept all major credit cards, debit cards, ' +
        'PayPal, and digital wallets like Apple Pay and Google Pay.',
    },
  ];

  const categories = Array.from(new Set(faqs.map((f) => f.category)));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Find answers to common questions
        </p>

        {categories.map((category) => (
          <div key={category} className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {category}
            </h2>
            <div className="space-y-4">
              {faqs
                .filter((faq) => faq.category === category)
                .map((faq) => {
                  const globalIndex = faqs.indexOf(faq);
                  const isOpen = openIndex === globalIndex;
                  return (
                    <Card key={globalIndex}>
                      <CardContent className="p-0">
                        <button
                          onClick={() =>
                            setOpenIndex(isOpen ? null : globalIndex)
                          }
                          className="w-full p-6 text-left flex items-center
                          justify-between hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-semibold text-foreground">
                            {faq.question}
                          </span>
                          {isOpen ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-6">
                            <p className="text-muted-foreground">
                              {faq.answer}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
