import { Queue } from "./queue"

type QueueItem = {
  reject: (reason?: unknown) => void
  run: () => void
}

type LimiterOptions = {
  concurrency: number
  rejectOnClear?: boolean
}

type LimitFunction = (<Arguments extends unknown[], ReturnType>(
  fn: (...args: Arguments) => PromiseLike<ReturnType> | ReturnType,
  ...args: Arguments
) => Promise<ReturnType>) & {
  activeCount: number
  pendingCount: number
  clearQueue: () => void
  concurrency: number
  map: <Value, ReturnType>(
    iterable: Iterable<Value>,
    fn: (value: Value, index: number) => PromiseLike<ReturnType> | ReturnType,
  ) => Promise<ReturnType[]>
}

export function limiter(
  concurrencyOrOptions: number | LimiterOptions,
): LimitFunction {
  let concurrency: number
  let rejectOnClear = false

  if (typeof concurrencyOrOptions === "object") {
    ;({ concurrency, rejectOnClear = false } = concurrencyOrOptions)
  } else {
    concurrency = concurrencyOrOptions
  }

  validateConcurrency(concurrency)

  if (typeof rejectOnClear !== "boolean") {
    throw new TypeError("Expected `rejectOnClear` to be a boolean")
  }

  const queue = new Queue<QueueItem>()
  let activeCount = 0

  const resumeNext = () => {
    if (activeCount < concurrency && queue.size > 0) {
      activeCount += 1
      queue.dequeue()?.run()
    }
  }

  const next = () => {
    activeCount -= 1
    resumeNext()
  }

  const run = async <Arguments extends unknown[], ReturnType>(
    fn: (...args: Arguments) => PromiseLike<ReturnType> | ReturnType,
    resolve: (value: Promise<ReturnType>) => void,
    args: Arguments,
  ) => {
    const result = (async () => fn(...args))()

    resolve(result)

    try {
      await result
    } catch {
      // Preserve the original rejection for the caller.
    }

    next()
  }

  const enqueue = <Arguments extends unknown[], ReturnType>(
    fn: (...args: Arguments) => PromiseLike<ReturnType> | ReturnType,
    resolve: (value: Promise<ReturnType>) => void,
    reject: (reason?: unknown) => void,
    args: Arguments,
  ) => {
    const queueItem = {} as QueueItem
    queueItem.reject = reject

    new Promise<void>((internalResolve) => {
      queueItem.run = internalResolve
      queue.enqueue(queueItem)
    }).then(() => run(fn, resolve, args))

    if (activeCount < concurrency) {
      resumeNext()
    }
  }

  const limit = (<Arguments extends unknown[], ReturnType>(
    fn: (...args: Arguments) => PromiseLike<ReturnType> | ReturnType,
    ...args: Arguments
  ) =>
    new Promise<ReturnType>((resolve, reject) => {
      enqueue(fn, resolve, reject, args)
    })) as LimitFunction

  Object.defineProperties(limit, {
    activeCount: {
      get: () => activeCount,
    },
    pendingCount: {
      get: () => queue.size,
    },
    clearQueue: {
      value: () => {
        if (!rejectOnClear) {
          queue.clear()
          return
        }

        const abortError = AbortSignal.abort().reason

        for (const item of queue.drain()) {
          item.reject(abortError)
        }
      },
    },
    concurrency: {
      get: () => concurrency,
      set: (newConcurrency: number) => {
        validateConcurrency(newConcurrency)
        concurrency = newConcurrency

        queueMicrotask(() => {
          while (activeCount < concurrency && queue.size > 0) {
            resumeNext()
          }
        })
      },
    },
    map: {
      value: async <Value, ReturnType>(
        iterable: Iterable<Value>,
        fn: (value: Value, index: number) => PromiseLike<ReturnType> | ReturnType,
      ) => {
        const promises = Array.from(iterable, (value, index) =>
          limit(fn, value, index),
        )

        return Promise.all(promises)
      },
    },
  })

  return limit
}

export function limitFunction<Arguments extends unknown[], ReturnType>(
  fn: (...args: Arguments) => PromiseLike<ReturnType> | ReturnType,
  options: number | LimiterOptions,
): (...args: Arguments) => Promise<ReturnType> {
  const limit = limiter(options)

  return (...args: Arguments) => limit(() => fn(...args))
}

function validateConcurrency(concurrency: number): void {
  if (
    !(
      (Number.isInteger(concurrency) ||
        concurrency === Number.POSITIVE_INFINITY) &&
      concurrency > 0
    )
  ) {
    throw new TypeError("Expected `concurrency` to be a number from 1 and up")
  }
}
