import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Personal Information
              </h3>
              <p className="text-muted-foreground">
                We collect information you provide directly, including name,
                email address, shipping address, and payment information.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Automatically Collected Information
              </h3>
              <p className="text-muted-foreground">
                We collect device information, IP address, browser type, and
                usage data to improve our services.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Process and fulfill your orders</li>
              <li>Communicate about your account and orders</li>
              <li>Improve our platform and services</li>
              <li>Send marketing communications (with your consent)</li>
              <li>Prevent fraud and ensure security</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Security</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We implement appropriate security measures to protect your
              personal information. However, no method of transmission over the
              internet is 100% secure.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
