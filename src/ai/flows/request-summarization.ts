// request-summarization.ts
'use server';
/**
 * @fileOverview Summarizes delivery requests using AI.
 *
 * - summarizeRequest - A function to summarize delivery requests.
 * - SummarizeRequestInput - The input type for the summarizeRequest function.
 * - SummarizeRequestOutput - The return type for the summarizeRequest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeRequestInputSchema = z.object({
  deliveryRequest: z
    .string()
    .describe('The delivery request including comments or custom requests.'),
});

export type SummarizeRequestInput = z.infer<typeof SummarizeRequestInputSchema>;

const SummarizeRequestOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the delivery request.'),
});

export type SummarizeRequestOutput = z.infer<typeof SummarizeRequestOutputSchema>;

export async function summarizeRequest(input: SummarizeRequestInput): Promise<SummarizeRequestOutput> {
  return summarizeRequestFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeRequestPrompt',
  input: {schema: SummarizeRequestInputSchema},
  output: {schema: SummarizeRequestOutputSchema},
  prompt: `You are an AI assistant that summarizes delivery requests.

  Summarize the following delivery request in a concise manner:

  {{{deliveryRequest}}}`,
});

const summarizeRequestFlow = ai.defineFlow(
  {
    name: 'summarizeRequestFlow',
    inputSchema: SummarizeRequestInputSchema,
    outputSchema: SummarizeRequestOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
