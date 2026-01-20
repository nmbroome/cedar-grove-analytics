import ProtectedRoute from '@/components/ProtectedRoute';
import BillingSummariesView from '@/components/views/BillingSummariesView';

export default function BillingSummariesPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="min-h-screen bg-cg-background p-6">
        <div className="max-w-7xl mx-auto">
          <BillingSummariesView />
        </div>
      </div>
    </ProtectedRoute>
  );
}