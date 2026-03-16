import { schedules } from '@trigger.dev/sdk/v3';
import { runRadarScan } from '@sla/pipeline';

export const radarScanJob = schedules.task({
  id: 'radar-scan',
  cron: '0 */3 * * *',
  run: runRadarScan,
});
