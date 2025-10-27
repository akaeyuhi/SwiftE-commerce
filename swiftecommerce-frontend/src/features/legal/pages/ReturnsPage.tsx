import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';

export function ReturnsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Returns & Exchanges
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Our return and exchange policy
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Return Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-foreground">
              We offer a 30-day return policy for most items. To be eligible for
              a return, items must be unused and in the same condition as
              received.
            </p>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                How to Return
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Contact the seller within 30 days of delivery</li>
                <li>Obtain a return authorization number</li>
                <li>Package the item securely with all original materials</li>
                <li>Ship the item back using provided label</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exchanges</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              We offer exchanges for defective or damaged items. Contact
              customer service within 7 days of receiving a defective product.
            </p>
            <p className="text-muted-foreground">
              Refunds will be processed within 5-10 business days after
              receiving your return.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
