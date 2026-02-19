import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { TenantProvider } from '@/app/providers/TenantProvider';

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  // TenantProvider resolves tenant from hostname, which is mocked in setup.ts
  // For tests, it will use the default tenant
  return (
    <TenantProvider>
      {children}
    </TenantProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
