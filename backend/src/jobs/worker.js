import { dequeue, complete, fail } from './queue.js';

const handlers = {};

export function registerHandler(jobType, handlerFn) {
  handlers[jobType] = handlerFn;
}

export async function startWorker(pollIntervalMs = 5000) {
  console.log('[Worker] Started (poll every %dms)', pollIntervalMs);

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

      await handler(typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload);
      await complete(job.id);
    } catch (err) {
      if (job) {
        await fail(job.id, err.message);
      }
    }
  };

  setInterval(poll, pollIntervalMs);
}