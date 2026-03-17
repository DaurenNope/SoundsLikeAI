import { schedules } from '@trigger.dev/sdk/v3';
import { runPersonaReportSweep } from '@sla/pipeline';

export const personaReportJob = schedules.task({
  id: 'persona-report',
  cron: '*/30 * * * *',
  run: runPersonaReportSweep,
});
