export interface BatchProcessor<T, R> {
  process(jobs: T[]): Promise<R[]>;
}

export interface BatchingConfig {
  batchSize?: number;
  frequencyMs?: number;
}

export interface Job<T> {
  id: string;
  payload: T;
}

export interface JobResult<T> {
  id: string;
  result?: T;
  error?: Error;
}
