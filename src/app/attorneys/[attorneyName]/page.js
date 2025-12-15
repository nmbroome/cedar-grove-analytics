"use client";

import { useParams } from 'next/navigation';
import AttorneyDetailView from '@/components/views/AttorneyDetailView';

export default function AttorneyDetailPage() {
  const params = useParams();
  const attorneyName = decodeURIComponent(params.attorneyName);

  return <AttorneyDetailView attorneyName={attorneyName} />;
}