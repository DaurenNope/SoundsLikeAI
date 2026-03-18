import { task } from '@trigger.dev/sdk/v3';
import { processSignalQC } from '@sla/pipeline';

export const processSignalQCJob = task({
  id: 'process-signal-qc',
  run: async (payload: { userId?: string; personaId?: string }) => {
    await processSignalQC({
      userId: payload.userId,
      personaId: payload.personaId,
    });
  },
});
