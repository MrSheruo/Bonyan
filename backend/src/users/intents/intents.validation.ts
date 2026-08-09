import { z } from "zod";

export const setIntentsSchema = z.object({
    intents: z.array(
        z.object({
            intentId: z.number().int().positive(),
            percentage: z.number().min(0.01).max(100),
        })
    ),
});

export type SetIntentsInput = z.infer<typeof setIntentsSchema>;