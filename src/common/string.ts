export const truncate = (s: string, maxLength: number, truncationSuffix: string = '...') => {
  if (s == null || maxLength == null || maxLength < 0 || s.length <= maxLength)
    return s

  return s.substring(0, maxLength - 3).concat(truncationSuffix)
}
