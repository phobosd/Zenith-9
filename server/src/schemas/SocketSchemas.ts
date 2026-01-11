import { z } from 'zod';

export const CommandSchema = z.string().min(1).max(200);

export const CombatResultSchema = z.object({
    targetId: z.string().uuid().or(z.string().length(20).or(z.string().length(36))), // Handle different ID formats
    hitType: z.enum(['crit', 'hit', 'miss'])
});

export const TerminalBuySchema = z.object({
    itemName: z.string().min(1),
    cost: z.number().nonnegative()
});
