'use client';
import React from 'react';
import { IUCN_CATEGORIES } from '@/lib/iucn';

interface IUCNBadgeProps {
  category: 'CR' | 'EN' | 'VU' | 'NT' | 'LC' | 'DD' | 'NE' | string;
}

export default function IUCNBadge({ category }: IUCNBadgeProps) {
  const code = (category || 'NE').trim().toUpperCase() || 'NE';
  const definition = IUCN_CATEGORIES.find(item => item.code === code);
  const badgeClass = definition ? `badge-${code.toLowerCase()}` : 'badge-ne';

  return (
    <span className={`badge ${badgeClass}`} title={definition ? `${code}: ${definition.name}` : `Unknown label: ${code}`}>
      {code}
    </span>
  );
}
