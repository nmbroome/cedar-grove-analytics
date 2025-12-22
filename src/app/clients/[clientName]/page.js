"use client";

import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import ClientDetailView from '@/components/views/ClientDetailView';

export default function ClientDetailPage() {
  const params = useParams();
  const clientName = decodeURIComponent(params.clientName);

  return (
    <ProtectedRoute requireAdmin={true}>
      <ClientDetailView clientName={clientName} />
    </ProtectedRoute>
  );
}