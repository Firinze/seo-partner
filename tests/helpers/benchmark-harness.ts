export interface BenchmarkMetrics {
  readonly durationMs: number;
  readonly initialRssBytes: number;
  readonly peakRssBytes: number;
  readonly deltaRssBytes: number;
}

export interface BenchmarkReport<T> {
  readonly result: T;
  readonly metrics: BenchmarkMetrics;
}

/**
 * Runs an asynchronous or synchronous operation while sampling memory RSS
 * and calculating precise duration in milliseconds.
 */
export async function runBenchmark<T>(
  action: () => Promise<T> | T,
  sampleIntervalMs = 10,
): Promise<BenchmarkReport<T>> {
  if (typeof global.gc === 'function') {
    try {
      global.gc();
    } catch {
      // gc may be unavailable without flag
    }
  }

  const initialRssBytes = process.memoryUsage().rss;
  let peakRssBytes = initialRssBytes;

  const timer = setInterval(() => {
    const currentRss = process.memoryUsage().rss;
    if (currentRss > peakRssBytes) {
      peakRssBytes = currentRss;
    }
  }, sampleIntervalMs);

  const startTime = performance.now();
  try {
    const result = await action();
    const durationMs = performance.now() - startTime;
    clearInterval(timer);

    const endRss = process.memoryUsage().rss;
    if (endRss > peakRssBytes) {
      peakRssBytes = endRss;
    }

    return {
      result,
      metrics: {
        durationMs,
        initialRssBytes,
        peakRssBytes,
        deltaRssBytes: Math.max(0, peakRssBytes - initialRssBytes),
      },
    };
  } finally {
    clearInterval(timer);
  }
}
