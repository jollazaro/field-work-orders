/** Shared accent-fold for demo list search (mirrors backend TextSearch). */
export function foldSearchText(input: string | null | undefined): string {
  if (input == null || input.trim() === '') {
    return '';
  }
  return input
    .trim()
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase();
}

export function matchesSearch(haystack: string | null | undefined, foldedQuery: string): boolean {
  if (!foldedQuery) {
    return true;
  }
  return foldSearchText(haystack).includes(foldedQuery);
}
