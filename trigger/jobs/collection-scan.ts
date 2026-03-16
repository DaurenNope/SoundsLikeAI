import { schedules } from '@trigger.dev/sdk/v3';
import { runCollectionSweep } from '@sla/pipeline';

export const collectionScanJob = schedules.task({
  id: 'collection-scan',
  cron: '0 */6 * * *',
  run: runCollectionSweep,
});
