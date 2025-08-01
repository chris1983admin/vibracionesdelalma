'use server';
/**
 * @fileOverview A flow for generating a daily mantra.
 *
 * - getMantra - A function that returns a daily mantra.
 * - MantraOutput - The return type for the getMantra function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MantraOutputSchema = z.object({
  mantra: z.string().describe('A short, inspiring mantra in Spanish.'),
  description: z.string().describe('A short, one-sentence description or reflection for the mantra, in Spanish.')
});
export type MantraOutput = z.infer<typeof MantraOutputSchema>;

export async function getMantra(): Promise<MantraOutput> {
  return mantraFlow();
}

const prompt = ai.definePrompt({
  name: 'mantraPrompt',
  output: {schema: MantraOutputSchema},
  prompt: `Eres un guía espiritual y de bienestar, experto en terapias como biodecodificación, constelaciones familiares y velomancia. Genera un mantra corto, positivo e inspirador en español, relacionado con estos temas. Debe ser una frase concisa y poderosa. Además, proporciona una breve descripción o reflexión de una sola frase para acompañar el mantra.`,
});

const mantraFlow = ai.defineFlow(
  {
    name: 'mantraFlow',
    outputSchema: MantraOutputSchema,
  },
  async () => {
    const {output} = await prompt();
    return output!;
  }
);
