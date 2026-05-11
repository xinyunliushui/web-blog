/**
 * 相同 key 的并发调用合并为一次真实请求（例如 React StrictMode 下 effect 会跑两轮）。
 * 请求结束后再次调用才会发起新请求。
 */
const inflight = new Map<string, Promise<unknown>>();

export function runDeduped<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = run().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}
