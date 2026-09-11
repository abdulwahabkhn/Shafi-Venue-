export const defaultExpenseItems = [
 'Staff food', 'Rental waiters', 'Fans rent', 'Tissue', 'Surf',
 'Air fresheners', 'Cobra spray', 'Cylinder', 'Batteries', 'Desiel',
 'Fireworks', 'Plastic Dori', 'Ribbons', 'Flower petals', 'Electric items',
 'Dishwashers', 'Broom', 'Brushes', 'Towel', 'Dustbin', 'Agriculture expense',
 'Seeds', 'Spray', 'Khaad', 'Govt taxes', 'Court expenses', 'Misc..', "Extra's",
] as const;

/** The three top-level ledgers used by the daily expense sheet. */
export const expenseCategories = [
 'Marquee expense', 'Agriculture expense', 'Court and govt. expense',
] as const;
export type ExpenseCategory = typeof expenseCategories[number];

const agricultureItems = new Set(['Agriculture expense', 'Seeds', 'Spray', 'Khaad']);
const courtGovtItems = new Set(['Govt taxes', 'Court expenses']);
export function categoryForExpenseItem(item: string, category?: string): ExpenseCategory {
 const normalized = item.trim().replace(/\s+/g, ' ');
 if (agricultureItems.has(normalized)) return 'Agriculture expense';
 if (courtGovtItems.has(normalized)) return 'Court and govt. expense';
 if (expenseCategories.includes(category as ExpenseCategory)) return category as ExpenseCategory;
 return 'Marquee expense';
}

export function mergeExpenseItems(customNames: string[]): string[] {
 const items: string[] = [];
 const seen = new Set<string>();
 for (const raw of [...defaultExpenseItems, ...[...customNames].sort((a,b)=>a.localeCompare(b,'en'))]) {
  const name = raw.trim().replace(/\s+/g, ' ');
  const key = name.toLocaleLowerCase('en');
  if (name && !seen.has(key)) { seen.add(key); items.push(name); }
 }
 return items;
}
