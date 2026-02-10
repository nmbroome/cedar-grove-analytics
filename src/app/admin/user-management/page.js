import ProtectedRoute from '@/components/ProtectedRoute';
import AdminUserManagement from '@/components/AdminUserManagement';

export default function AdminUserManagementPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <AdminUserManagement />
    </ProtectedRoute>
  );
}
