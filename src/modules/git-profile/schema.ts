import { z } from "zod";

export const GitStatsSchema = z.object({
  username: z.string(),
  url: z.string().url(),
  year: z.number(),
  totalContributions: z.number(),
  avatarUrl: z.string().url().nullable().optional(),
  dailyStats: z.record(z.string(), z.number()),
  currentStreak: z.number(),
  longestStreak: z.number(),
  lastUpdated: z.string().datetime(),
});

export type GitStats = z.infer<typeof GitStatsSchema>;
