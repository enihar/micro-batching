import { BatchProcessor, BatchingConfig, Job, JobResult } from './types';

interface InternalJob<T, R> extends Job<T> {
  resolve: (result: JobResult<R>) => void;
}

export class MicroBatchProcessor<T, R> {
  private batchProcessor: BatchProcessor<T, R>;
  private pendingJobs: Job<T>[] = []; // Jobs wait in this queue before they are processed
  private isShuttingDown: boolean = false;
  private batchSize: number;
  private batchFrequency: number;
  /**
   * A timer to schedule batch processing after a certain interval.
   * The timer starts when the first job is submitted, and ensures that jobs are processed
   * even if the batch size has not been reached.
   *
   * Once the batch is processed (either due to reaching the batch size or timeout),
   * the timer is cleared to avoid multiple triggers.
   */
  private batchTimer: NodeJS.Timeout | null = null;

  /**
   * Creates an instance of MicroBatchProcessor.
   * @param batchProcessor - The processor that will handle batch processing of jobs.
   * @param config - Configuration for batching behavior, including batch size and frequency.
   */
  constructor(batchProcessor: BatchProcessor<T, R>, config?: BatchingConfig) {
    this.batchProcessor = batchProcessor;
    this.batchSize = config?.batchSize || 10; // if batchSize not provided by client, system defaults to 10
    this.batchFrequency = config?.frequencyMs || 1000; // if frequencyMs not provided by client, system defaults to 1 sec
  }

  /**
   * Submits a job for processing.
   * @param job - The job to be submitted.
   * @returns A promise that resolves with the result of the job processing.
   */
  submitJob(job: Job<T>): Promise<JobResult<R>> {
    // if system is shutting down, new jobs are not accepted
    if (this.isShuttingDown) {
      throw new Error('Cannot submit job - the system is shutting down.');
    }

    // Return a promise that will resolve when the job is processed
    return new Promise((resolve) => {
      const internalJob: InternalJob<T, R> = {
        ...job,
        resolve,
      };
      this.pendingJobs.push(internalJob);

      // If batch size is reached, process the batch immediately
      if (this.pendingJobs.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.batchTimer) {
        // Set a timeout to process the batch after the configured frequencyMs
        this.batchTimer = setTimeout(
          () => this.processBatch(),
          this.batchFrequency,
        );
      }
    });
  }

  /**
   * Initiates the shutdown process, preventing new jobs from being submitted.
   * Waits for any pending jobs to be processed.
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true; // to ensure any new jobs are not accepted

    // To prevent any new batches from starting
    this.clearBatchTimer();

    // Process all the pending jobs from the queue
    if (this.pendingJobs.length > 0) {
      await this.processBatch();
    }
  }

  /**
   * Clears the current batch timer if it exists.
   */
  private clearBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Processes a batch of pending jobs using the batch processor.
   */
  private async processBatch(): Promise<void> {
    // Clear existing timeout created before to process a batch
    this.clearBatchTimer();

    const jobsToProcess = this.pendingJobs.splice(0, this.batchSize);
    try {
      // Process jobs using the given batch processor
      const results = await this.batchProcessor.process(
        jobsToProcess.map((job) => job.payload),
      );

      results.forEach((result, index) => {
        const job = jobsToProcess[index] as InternalJob<T, R>;
        job.resolve({ id: job.id, result });
      });
    } catch (error) {
      // Handle by resolving jobs with the error
      jobsToProcess.forEach((job) => {
        const internalJob = job as InternalJob<T, R>;
        internalJob.resolve({
          id: internalJob.id,
          error: error instanceof Error ? error : new Error('Unknown error'),
        });
      });
    }
  }
}
