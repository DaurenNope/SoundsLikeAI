import { schedules } from '@trigger.dev/sdk/v3';
import { processQueuedSignals } from '@sla/pipeline';

export const processSignalQueueJob = schedules.task({
  id: 'process-signal-queue',
  cron: '*/30 * * * *',
  run: processQueuedSignals,
});
