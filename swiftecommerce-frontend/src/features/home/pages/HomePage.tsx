import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';
import { useNavigate } from '@/shared/hooks/useNavigate';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">Welcome to SwiftE-commerce</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Your one-stop shop for all your needs
      </p>

      <div className="flex gap-4">
        <button
          onClick={() => navigate.toProducts()}
          className="px-6 py-3 bg-primary text-white rounded-lg"
        >
          Browse Products
        </button>

        <Link to={ROUTES.LOGIN} variant="primary">
          Login
        </Link>
      </div>
    </div>
  );
}
