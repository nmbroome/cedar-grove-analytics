import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTransactions from '@/components/AdminTransactions';

export default function AdminTransactionsPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <AdminTransactions />
    </ProtectedRoute>
  );
}
