
import { defineFlow, run } from 'genkit';
import { geminiPro } from '@genkit-ai/googleai';
import { z } from 'zod';

export const menuSuggestionFlow = defineFlow(
  {
    name: 'menuSuggestionFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (subject) => {
    const llmResponse = await run('generate-story', () =>
      geminiPro.generate({
        prompt: `Tell me a short story about ${subject}`,
      })
    );

    return llmResponse.text();
  }
);
