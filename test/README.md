# XOM3 Master Command Center - Testing

This directory contains the testing infrastructure for the XOM3 Master Command Center UI.

## Setup

The testing framework uses:
- **Vitest** - Fast unit test framework
- **React Testing Library** - React component testing utilities
- **jsdom** - DOM environment for testing

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests with UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
test/
├── setup.ts              # Global test setup and mocks
├── utils/
│   └── testUtils.tsx     # Custom render utilities with providers
└── mocks/
    └── xom3MasterData.ts  # Mock data for XOM3 master data

app/xom3/
├── ui/
│   ├── Xom3MasterClient.test.tsx
│   ├── Xom3UiStateProvider.test.tsx
│   └── panels/
│       ├── GlobalHealthPanel.test.tsx
│       ├── PanelFrame.test.tsx
│       ├── TenantOverviewPanel.test.tsx
│       └── SovereignUnitsPanel.test.tsx
└── useXom3MasterData.test.ts
```

## Writing Tests

### Component Tests

Use the custom `render` utility from `test/utils/testUtils.tsx` which includes necessary providers:

```tsx
import { render, screen } from '@/test/utils/testUtils';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Hook Tests

Use `renderHook` from `@testing-library/react`:

```tsx
import { renderHook } from '@testing-library/react';
import { useMyHook } from './useMyHook';

describe('useMyHook', () => {
  it('returns expected value', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current).toBeDefined();
  });
});
```

### Mock Data

Use mock data from `test/mocks/xom3MasterData.ts`:

```tsx
import { mockXom3MasterData } from '@/test/mocks/xom3MasterData';

render(<MyComponent data={mockXom3MasterData} />);
```

## Test Coverage

Current test coverage includes:
- ✅ Xom3MasterClient - Main dashboard component
- ✅ GlobalHealthPanel - Health status display
- ✅ TenantOverviewPanel - Tenant management
- ✅ SovereignUnitsPanel - Sovereign unit display
- ✅ PanelFrame - Reusable panel wrapper
- ✅ Xom3UiStateProvider - UI state management
- ✅ useXom3MasterData - Data fetching hook

## Best Practices

1. **Test user interactions** - Focus on what users see and do
2. **Use accessible queries** - Prefer `getByRole`, `getByLabelText`, etc.
3. **Mock external dependencies** - API calls, router, etc.
4. **Keep tests isolated** - Each test should be independent
5. **Use descriptive test names** - Clear what is being tested

## Troubleshooting

### Tests fail with "useRouter must be used within Next.js router"

The test setup mocks `next/navigation`. If you see this error, ensure your test imports from `test/setup.ts`.

### localStorage errors

The test setup mocks localStorage. If you need custom behavior, mock it in your test:

```tsx
beforeEach(() => {
  localStorage.getItem = vi.fn(() => 'some-value');
});
```

### Hydration mismatches

Ensure server and client render the same content. Check for:
- Date/time formatting differences
- Random values
- Browser-only APIs
