"use client";

import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AttorneyDetailView from '@/components/views/AttorneyDetailView';

export default function AttorneyDetailPage() {
  const params = useParams();
  const attorneyName = decodeURIComponent(params.attorneyName);

  return (
    <ProtectedRoute allowedAttorneyName={attorneyName}>
      <AttorneyDetailView attorneyName={attorneyName} />
    </ProtectedRoute>
  );
}