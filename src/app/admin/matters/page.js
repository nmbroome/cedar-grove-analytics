import ProtectedRoute from '@/components/ProtectedRoute';
import AdminMatterManagement from '@/components/AdminMatterManagement';

export default function AdminMattersPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <AdminMatterManagement />
    </ProtectedRoute>
  );
}
