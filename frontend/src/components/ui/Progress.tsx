'use client';

import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number; // 0 to 100 or 0 to 1
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export default function Progress({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  showLabel = false,
  label,
  className,
}: ProgressProps) {
  // Normalize value to percentage
  const normalizedValue = max === 1 ? value * 100 : (value / max) * 100;
  const clampedValue = Math.min(100, Math.max(0, normalizedValue));
  
  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };
  
  const colors = {
    primary: 'bg-primary-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };
  
  // Dynamic color based on value
  const getAutoColor = (val: number) => {
    if (val >= 70) return 'bg-green-500';
    if (val >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showLabel && <span className="text-sm text-gray-500">{clampedValue.toFixed(0)}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            color === 'primary' ? getAutoColor(clampedValue) : colors[color]
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
