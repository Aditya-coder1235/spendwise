import cron from 'node-cron';
import { env } from '../config/env.js';
import { processDueRecurring } from '../services/recurring.service.js';

let task = null;
let running = false;

async function runRecurringJob() {
  if (running) return;
  running = true;
  try {
    const result = await processDueRecurring();
    if (result.createdCount > 0) {
      console.log(
        `[recurring] Processed ${result.processed} schedules and created ${result.createdCount} transactions.`,
      );
    }
  } catch (error) {
    console.error('[recurring] Scheduled processing failed:', error.message);
  } finally {
    running = false;
  }
}

export function startRecurringScheduler() {
  if (env.isTest) return null;

  task = cron.schedule(env.recurringCron, runRecurringJob);
  // Process missed schedules shortly after boot, without delaying server startup.
  const bootTimer = setTimeout(runRecurringJob, 5_000);
  bootTimer.unref?.();
  return task;
}

export function stopRecurringScheduler() {
  if (task) task.stop();
  task = null;
}
