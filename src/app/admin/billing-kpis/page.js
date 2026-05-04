import ProtectedRoute from '@/components/ProtectedRoute';
import AdminBillingKPIs from '@/components/AdminBillingKPIs';

export default function AdminBillingKPIsPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <AdminBillingKPIs />
    </ProtectedRoute>
  );
}
