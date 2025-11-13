import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';
import {
  Store,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
} from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Store className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">
                SwiftE-commerce
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Your one-stop shop for all your needs. Quality products, great
              prices.
            </p>
            {/* Social Links */}
            <div className="flex gap-3">
              <a
                href="#"
                className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5 text-foreground" />
              </a>
              <a
                href="#"
                className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5 text-foreground" />
              </a>
              <a
                href="#"
                className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5 text-foreground" />
              </a>
              <a
                href="#"
                className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5 text-foreground" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-foreground font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to={ROUTES.PRODUCTS}
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Products
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-foreground font-semibold mb-4">
              Customer Service
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/shipping"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link
                  to="/returns"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="/track"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-foreground font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <a
                  href="mailto:support@swiftecommerce.com"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  support@swiftecommerce.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <a
                  href="tel:+15551234567"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  +1 (555) 123-4567
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  123 Commerce St, Business City, BC 12345
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              &copy; {new Date().getFullYear()} SwiftE-commerce. All rights
              reserved.
            </p>
            <div className="flex gap-4 text-sm">
              <Link
                to="/privacy"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Privacy
              </Link>
              <span className="text-border">•</span>
              <Link
                to="/terms"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Terms
              </Link>
              <span className="text-border">•</span>
              <Link
                to="/cookies"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
