import type { Option, OptionGroup } from '../types';

export function resolveOptionGroupIds(option: Option): string[] {
  if (option.optionGroupIds?.length) return option.optionGroupIds;
  if (option.optionGroupId) return [option.optionGroupId];
  return [];
}

/** Place each option under every linked group (with correct optionGroupId on the copy). */
export function bucketOptionsByGroupId(options: Option[]): Map<string, Option[]> {
  const map = new Map<string, Option[]>();
  for (const opt of options) {
    if (!opt.active) continue;
    for (const groupId of resolveOptionGroupIds(opt)) {
      const list = map.get(groupId) ?? [];
      list.push({ ...opt, optionGroupId: groupId });
      map.set(groupId, list);
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
  }
  return map;
}

export function formatOptionGroupNamesForOption(
  option: Option,
  optionGroups: OptionGroup[]
): string {
  return resolveOptionGroupIds(option)
    .map((id) => optionGroups.find((g) => g.id === id)?.name)
    .filter(Boolean)
    .join(', ');
}
