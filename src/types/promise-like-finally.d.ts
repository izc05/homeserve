interface PromiseLike<T> {
  finally(onfinally?: (() => void) | null): Promise<T>;
}
