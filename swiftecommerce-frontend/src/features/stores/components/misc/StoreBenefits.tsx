import { CheckCircle2 } from 'lucide-react';

const benefits = [
  {
    title: 'Easy Setup',
    description: 'Get started in minutes with our simple process',
  },
  {
    title: 'No Fees',
    description: 'Start selling with zero upfront costs',
  },
  {
    title: 'Full Control',
    description: 'Manage your products and orders your way',
  },
];

export function StoreBenefits() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {benefits.map((benefit) => (
        <div
          key={benefit.title}
          className="flex items-start gap-3 p-4 bg-card border border-border rounded-lg"
        >
          <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground text-sm mb-1">
              {benefit.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {benefit.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
