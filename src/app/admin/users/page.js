import ProtectedRoute from '@/components/ProtectedRoute';
import AdminUsers from '@/components/AdminUsers';

export default function AdminUsersPage() {
  return (
    <ProtectedRoute>
      <AdminUsers />
    </ProtectedRoute>
  );
}