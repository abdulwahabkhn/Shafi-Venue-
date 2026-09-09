export const halls = ['Hall 1', 'Hall 2', 'Hall 3'] as const;
export const bookingHallOptions = [...halls, 'Hall 1 + Hall 2', 'Hall 1 + Hall 3', 'Hall 2 + Hall 3', 'All halls'] as const;
export function reservedHalls(selection: string): readonly string[] {
  return selection === 'All halls' ? halls : selection.split(' + ');
}
export function sharesHall(a: string, b: string) {
  return reservedHalls(a).some(hall => reservedHalls(b).includes(hall));
}
