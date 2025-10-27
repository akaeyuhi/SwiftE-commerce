import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';

export function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Cookie Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>What Are Cookies?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Cookies are small text files stored on your device when you visit
              our website. They help us provide a better user experience and
              analyze site usage.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Types of Cookies We Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Essential Cookies
              </h3>
              <p className="text-muted-foreground">
                Required for the website to function properly, including
                authentication and security features.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Performance Cookies
              </h3>
              <p className="text-muted-foreground">
                Help us understand how visitors interact with our website by
                collecting anonymous data.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Functional Cookies
              </h3>
              <p className="text-muted-foreground">
                Remember your preferences and personalize your experience.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Managing Cookies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You can control cookie settings through your browser preferences.
              Note that disabling certain cookies may affect website
              functionality.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
