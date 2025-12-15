"use client";

import { useParams } from 'next/navigation';
import ClientDetailView from '@/components/views/ClientDetailView';

export default function ClientDetailPage() {
  const params = useParams();
  const clientName = decodeURIComponent(params.clientName);

  return <ClientDetailView clientName={clientName} />;
}