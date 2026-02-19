import React from 'react';

interface PanelFrameProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function PanelFrame({ title, children, className = '' }: PanelFrameProps) {
  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}







