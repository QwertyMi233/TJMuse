import type {TaskCategory} from './types';

export const DEFAULT_CATEGORY_ORDER:TaskCategory[]=['todo','course','homework'];

// Old installs have no order. Keep valid saved choices, remove duplicates and
// append any missing categories so a bad preference can never hide a section.
export function normalizeCategoryOrder(value:unknown):TaskCategory[]{
  const ordered=Array.isArray(value)?value.filter((item):item is TaskCategory=>DEFAULT_CATEGORY_ORDER.includes(item)):[];
  return [...new Set([...ordered,...DEFAULT_CATEGORY_ORDER])];
}

export function moveCategory(order:TaskCategory[],from:number,to:number):TaskCategory[]{
  'worklet';
  const next=[...order];
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=next.length||to>=next.length)return next;
  const [item]=next.splice(from,1);next.splice(to,0,item!);return next;
}
