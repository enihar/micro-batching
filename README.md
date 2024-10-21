# Mocro Batching Library

A simple micro-batching library created in TypeScript

## Table of Contents

- [Mocro Batching Library](#mocro-batching-library)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Build](#build)
  - [Testing](#testing)
  - [Core Features](#core-features)
  - [Future Extension Features](#future-extension-features)
  - [Linting and Formatting](#linting-and-formatting)
    - [Linting](#linting)
    - [Formatting](#formatting)
    - [Husky Pre-Commit Hook](#husky-pre-commit-hook)
  - [Folder Structure](#folder-structure)
  - [Summary](#summary)

## Installation

Clone the repository and navigate into it:

```bash
git clone https://github.com/enihar/micro-batching.git
cd micro-batching
```

Install the dependencies:

```bash
npm install
```

## Build

To compile the TypeScript code to JavaScript:

```bash
npm run build
```

The compiled files will be generated in the `dist` directory.

## Testing

This project uses Jest for unit testing.

To run tests:

```bash
npm run test
```

Make sure that the project is built (`npm run build`) before running the tests. The test files import the compiled code from the `dist` directory.

## Core Features

<img width="950" alt="Screenshot 2024-10-20 at 4 43 47 pm" src="https://github.com/user-attachments/assets/8bf2adc0-5dda-4b4d-8674-939e1e04cb22">



1. **Job Submission (`submitJob`)**

   - Allows a caller to submit a single job for processing.
   - Returns a `Promise` that resolves with the result (`JobResult`) after processing.
   - Jobs are stored in an internal queue (`pendingJobs`) and processed in batches based on configuration.
   - Jobs submitted during shutdown are rejected.

2. **Batch Processing**

   - Uses the `BatchProcessor` dependency to process accepted jobs in small batches.
   - A batch is processed either when the configured batch size is reached or after the configured timeout (`batchFrequency`).

3. **Configurable Batching Behavior**

   - `batchSize`: Configurable maximum number of jobs that can be processed in a single batch. Defaults to `10` if not provided.
   - `batchFrequency`: Configurable time interval (in milliseconds) after which a batch of jobs will be processed if the batch size has not been reached. Defaults to `1000 ms` if not provided.
   - This allows the client to tune the batching behavior to match their throughput and latency requirements.

4. **Graceful Shutdown (`shutdown`)**

   - The `shutdown()` method ensures that no new jobs are accepted once the shutdown process has started.
   - Pending jobs in the queue are processed before the system fully shuts down, ensuring that no submitted jobs are lost.
   - The batch timer is cleared to prevent new batches from starting during shutdown.

5. **Clear Timer Management (`clearBatchTimer`)**

   - Clears the batch timer (`batchTimer`) used to trigger periodic batch processing.
   - Ensures that no unnecessary or orphaned timers are left running, which could impact system performance.

6. **Robust Error Handling**
   - Errors during job submission are logged and rejected with an appropriate error message.
   - Errors during batch processing are handled individually for each job, resolving the job promises with error messages.
   - This ensures no silent failures, and all job results—successful or failed—are returned appropriately.

## Future Extension Features

1. **Priority Handling for Jobs**

   - Allow jobs to have a priority field, ensuring that high-priority jobs are processed first, enhancing flexibility for different processing requirements.

2. **Retry Logic**

   - Introduce retry logic for jobs that fail due to transient issues, with configurable retry attempts to ensure reliability.

3. **Metrics and Monitoring**

   - Expose metrics such as total jobs processed, batches executed, and errors to provide insight into the system's performance and health.

4. **Persistence for Jobs**

   - Implement persistence for pending jobs to a database, allowing recovery and continuation of processing in the event of a system crash or restart.

5. **Job Cancellation**

   - Allow the ability to cancel pending jobs, providing more control in cases where a job is no longer relevant or needed.

6. **Configurable Backoff Strategy for Retries**

   - Implement an exponential backoff strategy for retries, allowing the system to wait progressively longer between each retry attempt, reducing strain on downstream systems.

## Linting and Formatting

This project uses ESLint and Prettier for linting and formatting.

### Linting

To run ESLint:

```bash
npm run lint
```

This will check the code for any linting errors.

### Formatting

To format the code using Prettier:

```bash
npm run format
```

### Husky Pre-Commit Hook

Husky is set up to run linting and testing before each commit. If there are any issues, the commit will be blocked until they are resolved.

To manually test the Husky hook, try committing after making some changes:

```bash
git add <file>
git commit -m "Test commit"
```

If Husky is working correctly, it will run `npm run lint` and `npm run test` before completing the commit.

## Folder Structure

```
micro-batching/
├── src/
│   └── index.ts                # Main source code of the library
│   └── type.ts                 # TypeScript type definitions for the library
├── __tests__/                  # Unit tests for the library
│   └── index.test.ts
├── dist/                       # Compiled JavaScript output (generated by TypeScript compiler)
├── .husky/                     # Husky Git hooks
│   └── pre-commit
├── node_modules/
├── .gitignore
├── eslint.config.js            # ESLint configuration file
├── jest.config.js              # Jest configuration file
├── package.json
├── tsconfig.json               # TypeScript configuration file
├── README.md
```

## Summary

This project is set up with TypeScript, ESLint, Prettier, Jest, and Husky to ensure high code quality and ease of development. Use the provided scripts for building, testing, linting, and formatting to maintain consistency and quality throughout the project.
