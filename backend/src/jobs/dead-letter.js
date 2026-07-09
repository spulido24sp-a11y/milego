import db from '../config/database.js';

export async function getFailedJobs(page = 1, perPage = 50) {
  const query = db('failed_jobs').orderBy('failed_at', 'desc');
  const total = await query.clone().count('* as count').first();
  const jobs = await query.offset((page - 1) * perPage).limit(perPage);
  return { jobs, total: parseInt(total.count, 10) };
}

export async function retryFailedJob(failedJobId) {
  const failed = await db('failed_jobs').where({ id: failedJobId }).first();
  if (!failed) {
    const err = new Error('Failed job not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const [job] = await db('jobs').insert({
    type: failed.type,
    payload: typeof failed.payload === 'string' ? failed.payload : JSON.stringify(failed.payload),
    status: 'pending',
    max_attempts: 3,
  }).returning('*');

  await db('failed_jobs').where({ id: failedJobId }).del();
  return job;
}
