import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';
import { useNavigate } from '@/shared/hooks/useNavigate';
import {
  ArrowRight,
  ShoppingBag,
  Shield,
  Zap,
  Star,
  Package,
  Truck,
} from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary-50 to-background py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Welcome to SwiftE-commerce
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Discover amazing products from trusted sellers. Shop with
              confidence and enjoy fast, secure delivery.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate.toProducts()}
                className="inline-flex items-center justify-center gap-2 px-8 py-4
                  bg-primary text-primary-foreground font-semibold rounded-lg
                  hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
              >
                <ShoppingBag className="h-5 w-5" />
                Browse Products
                <ArrowRight className="h-5 w-5" />
              </button>
              <Link
                to={ROUTES.REGISTER}
                className="inline-flex items-center justify-center px-8 py-4
                  border-2 border-primary text-primary font-semibold rounded-lg
                  hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose SwiftE-commerce?
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need for a seamless shopping experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div
                className="inline-flex items-center justify-center w-16 h-16
                bg-primary-100 text-primary rounded-full mb-4"
              >
                <Truck className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Fast Delivery
              </h3>
              <p className="text-muted-foreground">
                Get your orders delivered quickly and reliably
              </p>
            </div>

            <div className="text-center">
              <div
                className="inline-flex items-center justify-center w-16 h-16
                bg-success-light text-success rounded-full mb-4"
              >
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Secure Shopping
              </h3>
              <p className="text-muted-foreground">
                Your data and payments are always protected
              </p>
            </div>

            <div className="text-center">
              <div
                className="inline-flex items-center justify-center w-16 h-16
                bg-warning-light text-warning rounded-full mb-4"
              >
                <Star className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Top Quality
              </h3>
              <p className="text-muted-foreground">
                Curated products from verified sellers
              </p>
            </div>

            <div className="text-center">
              <div
                className="inline-flex items-center justify-center w-16 h-16
                bg-info-light text-info rounded-full mb-4"
              >
                <Zap className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Easy Returns
              </h3>
              <p className="text-muted-foreground">
                Hassle-free returns within 30 days
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">10K+</div>
              <div className="text-muted-foreground">Products</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">5K+</div>
              <div className="text-muted-foreground">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Sellers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Support</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div
            className="max-w-4xl mx-auto bg-gradient-to-r from-primary to-primary-600
            rounded-2xl p-8 md:p-12 text-center shadow-xl"
          >
            <Package className="h-16 w-16 text-primary-foreground mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Start Selling Today
            </h2>
            <p className="text-lg text-primary-foreground/90 mb-8">
              Join thousands of sellers and grow your business with our platform
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={ROUTES.STORE_CREATE}
                className="inline-flex items-center justify-center px-8 py-4
                  bg-background text-foreground font-semibold rounded-lg
                  hover:bg-background/90 transition-colors shadow-lg border-2 border-background"
              >
                Create Store
              </Link>
              <Link
                to="/learn-more"
                className="inline-flex items-center justify-center px-8 py-4
                  border-2 border-primary-foreground text-primary-foreground
                  font-semibold rounded-lg
                  hover:bg-primary-foreground hover:text-primary transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
