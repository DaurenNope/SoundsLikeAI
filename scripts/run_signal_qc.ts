import 'dotenv/config';
import { processSignalQC } from '../packages/pipeline/src/signal-qc.ts';

processSignalQC({
  userId: process.env.QC_USER_ID,
  personaId: process.env.QC_PERSONA_ID,
})
  .then(() => {
    console.log('Signal QC complete');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
