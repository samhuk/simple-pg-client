export const loop = (
  fn: (next: (delayMs?: number) => void, i: number) => void,
) => {
  const next = (i: number) => fn(delayMs => {
    if (delayMs == null)
      next(i + 1)
    else
      setTimeout(() => next(i + 1), delayMs)
  }, i)
  next(0)
}
