import { useNavigate } from '@/shared/hooks/useNavigate';
import { CreateStoreHeader } from '../components/CreateStoreHeader';
import { StoreBenefits } from '../components/StoreBenefits';
import { CreateStoreForm } from '../components/CreateStoreForm';
import { NextStepsInfo } from '../components/NextStepsInfo';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';

export function CreateStorePage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate.toMyStores();
  };

  return (
    <ErrorBoundary title="Create Store Error">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <CreateStoreHeader />
          <StoreBenefits />
          <CreateStoreForm onSuccess={handleSuccess} />
          <NextStepsInfo />
        </div>
      </div>
    </ErrorBoundary>
  );
}
