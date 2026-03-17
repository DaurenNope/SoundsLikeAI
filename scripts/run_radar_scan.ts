import 'dotenv/config';
import { runRadarScan } from '../packages/pipeline/src/radar.ts';

runRadarScan({
  userId: process.env.RADAR_USER_ID,
  personaId: process.env.RADAR_PERSONA_ID,
  sourceId: process.env.RADAR_SOURCE_ID,
})
  .then(() => {
    console.log('Radar scan complete');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
