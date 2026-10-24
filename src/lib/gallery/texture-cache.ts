/**
 * Reference-counted cache with a bounded number of simultaneous loads. Textures are released when no artwork needs
 * them any more and disposed after a short grace period, so walking back and forth does not reload everything but
 * long tours do not accumulate GPU memory.
 */
export interface Disposable {
  dispose(): void;
}

interface Entry<T> {
  promise: Promise<T>;
  value: T | null;
  refs: number;
  timer: ReturnType<typeof setTimeout> | null;
}

export class TextureCache<T extends Disposable> {
  private entries = new Map<string, Entry<T>>();
  private queue: (() => void)[] = [];
  private active = 0;
  private load: (url: string) => Promise<T>;
  private options: { concurrency?: number; graceMs?: number };

  constructor(load: (url: string) => Promise<T>, options: { concurrency?: number; graceMs?: number } = {}) {
    this.load = load;
    this.options = options;
  }

  get size() {
    return this.entries.size;
  }

  acquire(url: string): { promise: Promise<T>; release: () => void } {
    let entry = this.entries.get(url);
    if (!entry) {
      entry = { promise: this.enqueue(url), value: null, refs: 0, timer: null };
      const created = entry;
      created.promise.then(
        (value) => {
          // Released and dropped while still loading: free it immediately.
          if (this.entries.get(url) !== created) value.dispose();
          else created.value = value;
        },
        () => {
          if (this.entries.get(url) === created) this.entries.delete(url);
        }
      );
      this.entries.set(url, entry);
    }
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    entry.refs += 1;

    const owner = entry;
    let released = false;
    return {
      promise: entry.promise,
      release: () => {
        if (released) return;
        released = true;
        owner.refs -= 1;
        if (owner.refs <= 0) owner.timer = setTimeout(() => this.drop(url, owner), this.options.graceMs ?? 4000);
      },
    };
  }

  private drop(url: string, entry: Entry<T>) {
    if (entry.refs > 0 || this.entries.get(url) !== entry) return;
    this.entries.delete(url);
    entry.value?.dispose();
  }

  /** Disposes everything now (WebGL context lost, or leaving the page). */
  clear() {
    for (const [, entry] of this.entries) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.value?.dispose();
    }
    this.entries.clear();
    this.queue = [];
  }

  private enqueue(url: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        this.active += 1;
        this.load(url)
          .then(resolve, reject)
          .finally(() => {
            this.active -= 1;
            this.next();
          });
      };
      if (this.active < (this.options.concurrency ?? 3)) run();
      else this.queue.push(run);
    });
  }

  private next() {
    const run = this.queue.shift();
    if (run) run();
  }
}
