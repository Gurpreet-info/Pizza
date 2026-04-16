import { useEffect } from 'react';
import { applyPageMeta } from '../lib/pageMeta';

/**
 * Updates document title and meta description when the route (or dynamic segment) changes.
 */
export function usePageMeta(title: string, description: string): void {
  useEffect(() => {
    applyPageMeta(title, description);
  }, [title, description]);
}
