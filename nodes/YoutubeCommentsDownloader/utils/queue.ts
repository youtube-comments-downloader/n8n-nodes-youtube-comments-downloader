class QueueNode<T> {
  value: T
  next?: QueueNode<T>

  constructor(value: T) {
    this.value = value
  }
}

export class Queue<T> {
  #head?: QueueNode<T>
  #tail?: QueueNode<T>
  #size = 0

  constructor() {
    this.clear()
  }

  enqueue(value: T): void {
    const node = new QueueNode(value)

    if (this.#head) {
      this.#tail!.next = node
      this.#tail = node
    } else {
      this.#head = node
      this.#tail = node
    }

    this.#size += 1
  }

  dequeue(): T | undefined {
    const current = this.#head
    if (!current) {
      return undefined
    }

    this.#head = current.next
    this.#size -= 1

    if (!this.#head) {
      this.#tail = undefined
    }

    return current.value
  }

  peek(): T | undefined {
    if (!this.#head) {
      return undefined
    }

    return this.#head.value
  }

  clear(): void {
    this.#head = undefined
    this.#tail = undefined
    this.#size = 0
  }

  get size(): number {
    return this.#size
  }

  get isEmpty(): boolean {
    return this.#size === 0
  }

  *[Symbol.iterator](): Generator<T, void, undefined> {
    let current = this.#head

    while (current) {
      yield current.value
      current = current.next
    }
  }

  *drain(): Generator<T, void, undefined> {
    while (this.#head) {
      const value = this.dequeue()
      if (value !== undefined) {
        yield value
      }
    }
  }
}
