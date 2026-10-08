// Minimal in-memory localStorage so the pure logic can run under Node.
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() {
    return store.size;
  },
};
// Object.keys(localStorage) must list stored keys, as in browsers.
(globalThis as any).localStorage = new Proxy((globalThis as any).localStorage, {
  ownKeys: () => Array.from(store.keys()),
  getOwnPropertyDescriptor: (t, p) =>
    typeof p === 'string' && store.has(p) ? { enumerable: true, configurable: true, value: store.get(p) } : Reflect.getOwnPropertyDescriptor(t, p),
});
export const resetStorage = () => store.clear();
