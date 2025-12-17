
import { googleAI } from '@genkit-ai/googleai';
import { firebase, enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { configureGenkit } from 'genkit';

enableFirebaseTelemetry();

export default configureGenkit({
  plugins: [
    firebase(),
    googleAI({ apiVersion: 'v1beta' }),
  ],
  logSinker: 'stdout',
  enableTracingAndMetrics: true,
  flowStateStore: 'firebase',
  traceStore: 'firebase',
});
