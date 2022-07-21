/**
 * A version of typescript's standard `Omit<T, K` where `K` is forced to
 * be a key in `T`, instead of anything as is the case with `Omit`.
 */
export type OmitTyped<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
