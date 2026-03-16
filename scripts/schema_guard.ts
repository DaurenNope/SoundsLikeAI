import 'dotenv/config';
import { assertSchemaOrThrow } from '../packages/db/src/schemaGuard.ts';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

assertSchemaOrThrow()
  .then(() => {
    console.log('Schema guard OK');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
