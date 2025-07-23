import React from 'react';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

export function Progress({
  value = 0,
  max = 100,
  className = '',
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={`bg-secondary relative h-4 w-full overflow-hidden rounded-full ${className}`}
      {...props}
    >
      <div
        className='bg-primary h-full w-full flex-1 transition-all'
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
}
