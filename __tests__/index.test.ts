import { jest } from '@jest/globals';

import { BatchProcessor } from '../src/types';
import { MicroBatchProcessor } from '../src';

class MockBatchProcessor implements BatchProcessor<number, number> {
  async process(jobs: number[]): Promise<number[]> {
    return jobs.map((job) => job * job); // Square each job value
  }
}

describe('MicroBatchProcessor', () => {
  it('should process jobs in batches', async () => {
    const batchProcessor = new MockBatchProcessor();
    const batchingConfig = { batchSize: 4, frequencyMs: 1000 };
    const microBatching = new MicroBatchProcessor<number, number>(
      batchProcessor,
      batchingConfig,
    );

    const job1 = { id: '1', payload: 1 };
    const job2 = { id: '2', payload: 2 };

    // Submit jobs
    const result1 = microBatching.submitJob(job1);
    const result2 = microBatching.submitJob(job2);

    // Wait for jobs to be processed
    const res1 = await result1;
    const res2 = await result2;

    // Verify the results
    expect(res1.result).toBe(1);
    expect(res2.result).toBe(4);
  });

  it('should process jobs in batches using default config', async () => {
    const batchProcessor = new MockBatchProcessor();
    const microBatching = new MicroBatchProcessor<number, number>(
      batchProcessor,
    );

    const job1 = { id: '1', payload: 1 };
    const job2 = { id: '2', payload: 2 };

    // Submit jobs
    const result1 = microBatching.submitJob(job1);
    const result2 = microBatching.submitJob(job2);

    // Wait for jobs to be processed
    const res1 = await result1;
    const res2 = await result2;

    // Verify the results
    expect(res1.result).toBe(1);
    expect(res2.result).toBe(4);
  });

  it('should process jobs immediately when batch size is reached, without waiting for the batch timer', async () => {
    const batchProcessor = new MockBatchProcessor();
    const batchingConfig = { batchSize: 2, frequencyMs: 5000 }; // Set a longer timeout
    const microBatching = new MicroBatchProcessor<number, number>(
      batchProcessor,
      batchingConfig,
    );

    const job1 = { id: '1', payload: 1 };
    const job2 = { id: '2', payload: 2 };

    // Submit jobs to reach batch size
    const result1 = microBatching.submitJob(job1);
    const result2 = microBatching.submitJob(job2);

    // Wait for jobs to be processed (batch size should trigger before frequency)
    const res1 = await result1;
    const res2 = await result2;

    // Verify the results
    expect(res1.result).toBe(1);
    expect(res2.result).toBe(4);
  });

  it('should process jobs after batch frequency timeout if batch size is not reached', async () => {
    const batchProcessor = new MockBatchProcessor();
    const batchingConfig = { batchSize: 5, frequencyMs: 1000 };
    const microBatching = new MicroBatchProcessor<number, number>(
      batchProcessor,
      batchingConfig,
    );

    const job1 = { id: '1', payload: 1 };
    const job2 = { id: '2', payload: 2 };

    // Submit jobs below the batch size
    const result1 = microBatching.submitJob(job1);
    const result2 = microBatching.submitJob(job2);

    // Wait for the batch frequency timeout
    await new Promise((resolve) => setTimeout(resolve, 1200)); // notice 1200 is longer than frequencyMs(1000) to ensure timeout has occurred

    // Wait for jobs to be processed
    const res1 = await result1;
    const res2 = await result2;

    // Verify the results
    expect(res1.result).toBe(1);
    expect(res2.result).toBe(4);
  });

  it('should handle errors during batch processing', async () => {
    const batchProcessor = new MockBatchProcessor();
    jest
      .spyOn(batchProcessor, 'process')
      .mockRejectedValue(new Error('Processing error'));

    const batchingConfig = { batchSize: 2, frequencyMs: 1000 };
    const microBatching = new MicroBatchProcessor<number, number>(
      batchProcessor,
      batchingConfig,
    );

    const job1 = { id: '1', payload: 1 };
    const job2 = { id: '2', payload: 2 };

    // Submit jobs
    const result1 = microBatching.submitJob(job1);
    const result2 = microBatching.submitJob(job2);

    // Wait for jobs to be processed
    const res1 = await result1;
    const res2 = await result2;

    expect(res1.error).toBeInstanceOf(Error); // Verify the error for the first job
    expect(res1.error?.message).toBe('Processing error');
    expect(res2.error).toBeInstanceOf(Error); // Verify the error for the second job
    expect(res2.error?.message).toBe('Processing error');
  });

  it('should not accept jobs after shutdown is called', async () => {
    const batchProcessor = new MockBatchProcessor();
    const batchingConfig = { batchSize: 2, frequencyMs: 1000 };
    const microBatching = new MicroBatchProcessor<number, number>(
      batchProcessor,
      batchingConfig,
    );

    await microBatching.shutdown();

    expect(() => microBatching.submitJob({ id: '3', payload: 3 })).toThrow(
      'Cannot submit job - the system is shutting down.',
    );
  });

  it('should process all pending jobs before shutting down', async () => {
    const batchProcessor = new MockBatchProcessor();
    const batchingConfig = { batchSize: 4, frequencyMs: 4000 };
    const microBatching = new MicroBatchProcessor<number, number>(
      batchProcessor,
      batchingConfig,
    );

    const job1 = { id: '1', payload: 1 };
    const job2 = { id: '2', payload: 2 };
    const job3 = { id: '3', payload: 3 };
    const job4 = { id: '4', payload: 4 };
    const job5 = { id: '5', payload: 5 };
    const job6 = { id: '6', payload: 6 };

    const result1 = microBatching.submitJob(job1);
    const result2 = microBatching.submitJob(job2);
    const result3 = microBatching.submitJob(job3);
    const result4 = microBatching.submitJob(job4);
    const result5 = microBatching.submitJob(job5);
    const result6 = microBatching.submitJob(job6);

    // before shutdown is called 4 jobs will have been processed, leaving 2 pending jobs
    await microBatching.shutdown();

    // // Wait for all jobs to be processed
    const res1 = await result1;
    const res2 = await result2;
    const res3 = await result3;
    const res4 = await result4;
    const res5 = await result5;
    const res6 = await result6;

    // // Verify the results
    expect(res1.result).toBe(1);
    expect(res2.result).toBe(4);
    expect(res3.result).toBe(9);
    expect(res4.result).toBe(16);
    expect(res5.result).toBe(25);
    expect(res6.result).toBe(36);
  });
});
