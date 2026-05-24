import type { Option } from '../types';

/** e.g. "Extra cheese x2, Onions" */
export function formatSelectedOptionNames(options: Option[]): string {
  const counts = new Map<string, { name: string; count: number }>();
  for (const opt of options) {
    const existing = counts.get(opt.id);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(opt.id, { name: opt.name, count: 1 });
    }
  }
  return [...counts.values()]
    .map(({ name, count }) => (count > 1 ? `${name} x${count}` : name))
    .join(', ');
}
