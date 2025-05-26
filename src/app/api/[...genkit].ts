// src/app/api/[...genkit].ts
import { genkitNextJSHandler } from '@genkit-ai/next';
import '@/ai/flows/delivery-optimization';
import '@/ai/flows/request-summarization';

export const POST = genkitNextJSHandler();
