import db from '../config/database.js';

export async function enqueue(type, payload, availableAt = new Date()) {
  const [job] = await db('jobs').insert({
    type,
    payload: JSON.stringify(payload),
    status: 'pending',
    available_at: availableAt,
    max_attempts: 5,
  }).returning('*');
  return job;
}

export async function dequeue() {
  const [job] = await db('jobs')
    .where('status', 'pending')
    .where('available_at', '<=', db.fn.now())
    .orderBy('created_at', 'asc')
    .limit(1)
    .returning('*');

  if (job) {
    await db('jobs').where({ id: job.id }).update({ status: 'processing' });
  }

  return job;
}

export async function complete(jobId) {
  await db('jobs').where({ id: jobId }).update({
    status: 'completed',
    completed_at: db.fn.now(),
  });
}

export async function fail(jobId, reason) {
  const job = await db('jobs').where({ id: jobId }).first();
  const attempts = (job.attempts || 0) + 1;
  const maxAttempts = job.max_attempts || 5;

  if (attempts >= maxAttempts) {
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
    });
  }
}

function getBackoffDelay(attempt) {
  const delays = [30, 300, 1800, 7200, 21600];
  return delays[attempt - 1] || 21600;
}