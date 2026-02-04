"use client";

import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AttorneyDetailView from '@/components/views/AttorneyDetailView';

export default function UserDetailPage() {
  const params = useParams();
  const userName = decodeURIComponent(params.userName);

  return (
    <ProtectedRoute allowedAttorneyName={userName}>
      <AttorneyDetailView attorneyName={userName} />
    </ProtectedRoute>
  );
}
