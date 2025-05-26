// use server'

/**
 * @fileOverview Optimizes delivery strategies based on location and availability.
 *
 * - optimizeDelivery - A function that provides optimized delivery recommendations.
 * - OptimizeDeliveryInput - The input type for the optimizeDelivery function.
 * - OptimizeDeliveryOutput - The return type for the optimizeDelivery function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeDeliveryInputSchema = z.object({
  deliveryLocation: z
    .string()
    .describe('The delivery location address.'),
  availability: z
    .string()
    .describe(
      'The availability schedule for delivery, including days and times.'
    ),
  packageDetails: z
    .string()
    .describe('Details of the package to be delivered (e.g., size, weight).'),
});
export type OptimizeDeliveryInput = z.infer<typeof OptimizeDeliveryInputSchema>;

const OptimizeDeliveryOutputSchema = z.object({
  optimizedStrategy: z
    .string()
    .describe(
      'An optimized delivery strategy based on location, availability, and package details, including the recommended delivery method and route.'
    ),
  estimatedTime: z
    .string()
    .describe('The estimated delivery time based on the optimized strategy.'),
  additionalNotes: z
    .string()
    .optional()
    .describe(
      'Any additional notes or considerations for the delivery, such as potential delays or special instructions.'
    ),
});
export type OptimizeDeliveryOutput = z.infer<typeof OptimizeDeliveryOutputSchema>;

export async function optimizeDelivery(
  input: OptimizeDeliveryInput
): Promise<OptimizeDeliveryOutput> {
  return optimizeDeliveryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeDeliveryPrompt',
  input: {schema: OptimizeDeliveryInputSchema},
  output: {schema: OptimizeDeliveryOutputSchema},
  prompt: `You are a delivery optimization expert. Based on the delivery location, availability, and package details, provide an optimized delivery strategy.

Delivery Location: {{{deliveryLocation}}}
Availability: {{{availability}}}
Package Details: {{{packageDetails}}}

Consider factors like traffic, weather, and the best route to suggest the fastest and most efficient delivery option.  Provide an estimated delivery time.

Output the optimized delivery strategy, estimated time, and any additional notes in the output schema format.`,
});

const optimizeDeliveryFlow = ai.defineFlow(
  {
    name: 'optimizeDeliveryFlow',
    inputSchema: OptimizeDeliveryInputSchema,
    outputSchema: OptimizeDeliveryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
