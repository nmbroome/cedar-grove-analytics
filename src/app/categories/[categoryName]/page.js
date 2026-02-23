"use client";

import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import CategoryDetailView from '@/components/views/CategoryDetailView';

export default function CategoryDetailPage() {
  const params = useParams();
  const categoryName = decodeURIComponent(params.categoryName);

  return (
    <ProtectedRoute requireAdmin={true}>
      <CategoryDetailView categoryName={categoryName} />
    </ProtectedRoute>
  );
}
