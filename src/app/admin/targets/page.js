import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTargets from '@/components/AdminTargets';

export default function AdminTargetsPage() {
  return (
    <ProtectedRoute>
      <AdminTargets />
    </ProtectedRoute>
  );
}