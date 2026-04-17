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
