import { redirect } from 'next/navigation';

/**
 * Commerce page removed from nav (Phase 1). Store is the single shopping surface.
 * Redirect old /spacebaddie/commerce links to Store.
 */
export default function SpaceBaddieCommerceRedirect() {
  redirect('/spacebaddie/store');
}
