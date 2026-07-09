import { dequeue, complete, fail } from './queue.js';

const handlers = {};

export function registerHandler(jobType, handlerFn) {
  handlers[jobType] = handlerFn;
}

export async function startWorker(pollIntervalMs = 5000) {
  console.log(`[Worker] Started (poll every ${pollIntervalMs}ms)`);

  const poll = async () => {
    let job;
    try {
      job = await dequeue();
      if (!job) return;

      const handler = handlers[job.type];
      if (!handler) {
        await fail(job.id, `No handler for job type: ${job.type}`);
        return;
      }

      console.log(`[Worker] Processing job #${job.id} (${job.type})`);
      await handler(typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload);
      await complete(job.id);
      console.log(`[Worker] Completed job #${job.id}`);
    } catch (err) {
      if (job) {
        console.error(`[Worker] Failed job #${job.id}:`, err.message);
        await fail(job.id, err.message);
      }
    }
  };

  setInterval(poll, pollIntervalMs);
}