import 'dotenv/config';
import { runRadarScan } from '../packages/pipeline/src/radar.ts';

runRadarScan()
  .then(() => {
    console.log('Radar scan complete');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
