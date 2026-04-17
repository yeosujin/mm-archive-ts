export function parseTitle(title: string): { base: string; suffix: number | null } {
  const match = /-(\d+)$/.exec(title);
  if (match && String(Number(match[1])) === match[1]) {
    return { base: title.slice(0, -match[0].length), suffix: Number(match[1]) };
  }
  return { base: title, suffix: null };
}

export function getNextSuffixStart(
  baseTitle: string,
  existingTitles: string[]
): number {
  let maxSuffix = 0;

  for (const title of existingTitles) {
    if (title.startsWith(baseTitle + '-')) {
      const suffixPart = title.slice(baseTitle.length + 1);
      const num = parseInt(suffixPart, 10);
      if (!isNaN(num) && num > 0 && String(num) === suffixPart) {
        maxSuffix = Math.max(maxSuffix, num);
      }
    }
  }

  return maxSuffix + 1;
}
