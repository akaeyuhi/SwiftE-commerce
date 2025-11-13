import { Card, CardContent } from '@/shared/components/ui/Card';
import { Users, Target, Heart, Award } from 'lucide-react';

export function AboutUsPage() {
  const values = [
    {
      icon: Target,
      title: 'Our Mission',
      description: 'To connect buyers with quality sellers worldwide',
    },
    {
      icon: Users,
      title: 'Our Team',
      description: 'Dedicated professionals working to improve e-commerce',
    },
    {
      icon: Heart,
      title: 'Our Values',
      description: 'Trust, quality, and customer satisfaction first',
    },
    {
      icon: Award,
      title: 'Our Achievement',
      description: 'Serving millions of customers across the globe',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-4">About Us</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Learn more about our mission and values
        </p>

        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Who We Are
            </h2>
            <p className="text-foreground mb-4">
              We are a leading multi-vendor marketplace connecting buyers with
              trusted sellers worldwide. Since our founding, we&#39;ve been
              committed to providing a secure, efficient, and user-friendly
              platform for e-commerce.
            </p>
            <p className="text-foreground">
              Our platform enables entrepreneurs and businesses of all sizes to
              reach customers globally while maintaining the highest standards
              of quality and customer service.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <Card key={value.title}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className="h-12 w-12 bg-primary/10 rounded-lg
                    flex items-center justify-center"
                    >
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">
                        {value.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {value.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
