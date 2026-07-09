import db from '../config/database.js';
import { randomUUID } from 'crypto';

export async function enqueue(type, payload, availableAt = new Date(), correlationId = null) {
  const jobData = {
    type,
    payload: JSON.stringify(payload),
    status: 'pending',
    available_at: availableAt,
    max_attempts: 5,
  };
  if (correlationId) jobData.correlation_id = correlationId;

  const [job] = await db('jobs').insert(jobData).returning('*');
  return job;
}

export async function dequeue() {
  const [job] = await db('jobs')
    .where('status', 'pending')
    .where('available_at', '<=', db.fn.now())
    .orderBy('created_at', 'asc')
    .limit(1)
    .forUpdate()
    .skipLocked()
    .update({
      status: 'processing',
      locked_by: `worker-${randomUUID()}`,
      locked_at: db.fn.now(),
      started_at: db.fn.now(),
    })
    .returning('*');

  return job || null;
}

export async function complete(jobId) {
  await db('jobs').where({ id: jobId }).update({
    status: 'completed',
    completed_at: db.fn.now(),
  });
}

export async function fail(jobId, reason) {
  const job = await db('jobs').where({ id: jobId }).first();
  if (!job) return;

  const attempts = (job.attempts || 0) + 1;
  const maxAttempts = job.max_attempts || 5;

  if (attempts >= maxAttempts) {
    await db('failed_jobs').insert({
      original_job_id: jobId,
      type: job.type,
      payload: typeof job.payload === 'string' ? job.payload : JSON.stringify(job.payload),
      failed_reason: reason,
      attempts,
      failed_at: db.fn.now(),
    });

    await db('jobs').where({ id: jobId }).update({
      status: 'failed',
      failed_reason: reason,
      attempts,
    });
  } else {
    const backoffDelay = getBackoffDelay(attempts);
    await db('jobs').where({ id: jobId }).update({
      status: 'pending',
      attempts,
      available_at: new Date(Date.now() + backoffDelay * 1000),
      failed_reason: reason,
      locked_by: null,
      locked_at: null,
    });
  }
}

function getBackoffDelay(attempt) {
  const delays = [30, 300, 1800, 7200, 21600];
  return delays[attempt - 1] || 21600;
}