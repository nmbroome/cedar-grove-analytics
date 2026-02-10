import ProtectedRoute from '@/components/ProtectedRoute';
import AdminInvoices from '@/components/AdminInvoices';

export default function AdminInvoicesPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <AdminInvoices />
    </ProtectedRoute>
  );
}
