import { useEffect } from 'react';
import { applyPageMeta } from '../lib/pageMeta';
import { useApp } from '../context/AppContext';

/**
 * Updates document title and meta description.
 * If `pageKey` is provided, admin-managed DB SEO settings override fallback values.
 */
export function usePageMeta(title: string, description: string, pageKey?: string): void {
  const { seoSettings, ensureSeoSettingsLoaded } = useApp();

  useEffect(() => {
    if (!pageKey) return;
    void ensureSeoSettingsLoaded();
  }, [pageKey, ensureSeoSettingsLoaded]);

  const setting = pageKey ? seoSettings.find((x) => x.pageKey === pageKey) : undefined;
  const resolvedTitle = setting?.metaTitle?.trim() ? setting.metaTitle : title;
  const resolvedDescription = setting?.metaDescription?.trim() ? setting.metaDescription : description;

  useEffect(() => {
    applyPageMeta(resolvedTitle, resolvedDescription);
  }, [resolvedTitle, resolvedDescription]);
}
