/**
 * AbortSignal utility for async operation cancellation
 */

export function withAbortSignal<T>(
  promise: Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    return Promise.reject(
      signal.reason ??
        new DOMException("The operation was aborted", "AbortError")
    );
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () =>
      reject(
        signal.reason ??
          new DOMException("The operation was aborted", "AbortError")
      );
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (v) => {
        signal.removeEventListener("abort", onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener("abort", onAbort);
        reject(e);
      }
    );
  });
}
