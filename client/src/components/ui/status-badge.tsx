import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "aberta":
      return "bg-blue-500";
    case "em_analise":
      return "bg-yellow-500";
    case "urgente":
    case "URGENTE":
      return "bg-red-500";
    case "prorrogada":
      return "bg-orange-500";
    case "alterada":
      return "bg-purple-500";
    case "finalizada":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <div
      className={cn(
        "inline-block rounded font-bold text-white text-center",
        getStatusColor(status),
        className
      )}
      style={{
        padding: '6px 16px',
        minWidth: '90px',
        fontSize: '12px',
        whiteSpace: 'nowrap',
        lineHeight: '1.2',
        letterSpacing: '0.3px',
        fontWeight: '700',
        textTransform: 'uppercase',
        boxSizing: 'border-box',
        width: 'auto'
      }}
    >
      {status.toUpperCase()}
    </div>
  );
}