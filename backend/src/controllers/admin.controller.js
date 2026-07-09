import { replayEvent } from '../events/replay.js';
import { success } from '../utils/response.js';
import db from '../config/database.js';

export class AdminController {
  async replayEvent(req, res, next) {
    try {
      const event = await replayEvent(parseInt(req.params.id, 10));
      return success(res, { event_log_id: event?.id || event });
    } catch (err) {
      next(err);
    }
  }

  async retryJob(req, res, next) {
    try {
      const { retryFailedJob } = await import('../jobs/dead-letter.js');
      const job = await retryFailedJob(parseInt(req.params.id, 10));
      return success(res, { job_id: job.id });
    } catch (err) {
      next(err);
    }
  }

  async metrics(req, res, next) {
    try {
      const [activeJobs] = await db('jobs').where('status', 'processing').count('*');
      const [failed24h] = await db('failed_jobs')
        .where('failed_at', '>=', new Date(Date.now() - 86400000))
        .count('*');
      const [eventCount] = await db('event_logs').count('*');

      return success(res, {
        uptime: process.uptime(),
        active_jobs: parseInt(activeJobs.count, 10),
        failed_jobs_24h: parseInt(failed24h.count, 10),
        events_total: parseInt(eventCount.count, 10),
      });
    } catch (err) {
      next(err);
    }
  }
}
