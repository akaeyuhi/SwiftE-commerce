import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';

export function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              By accessing and using this platform, you accept and agree to be
              bound by these Terms of Service and our Privacy Policy.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>User Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities under your account.
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Provide accurate and complete information</li>
              <li>Keep your password secure</li>
              <li>Notify us of unauthorized access</li>
              <li>Use the platform lawfully</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Seller Responsibilities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-2">Sellers must:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Provide accurate product descriptions</li>
              <li>Honor stated prices and availability</li>
              <li>Ship orders promptly</li>
              <li>Respond to customer inquiries</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We are not liable for indirect, incidental, or consequential
              damages arising from your use of the platform.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
