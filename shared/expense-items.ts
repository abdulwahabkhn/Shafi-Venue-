export const defaultExpenseItems = [
 'Staff food', 'Rental waiters', 'Fans rent', 'Tissue', 'Surf',
 'Air fresheners', 'Cobra spray', 'Cylinder', 'Batteries', 'Desiel',
 'Fireworks', 'Plastic Dori', 'Ribbons', 'Flower petals', 'Electric items',
 'Dishwashers', 'Broom', 'Brushes', 'Towel', 'Dustbin', 'Agriculture expense',
 'Seeds', 'Spray', 'Khaad', 'Govt taxes', 'Court expenses', 'Misc..', "Extra's",
] as const;

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
