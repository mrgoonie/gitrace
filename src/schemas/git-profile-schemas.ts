import z from "zod";

// Base schemas
export const yearlyStatsSchema = z.object({
  year: z.number().int().min(2000).max(new Date().getFullYear()),
  contributions: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  dates: z
    .record(z.number())
    .transform((val) => val as any)
    .nullable(),
});

export const gitProfileSchema = z.object({
  username: z.string().min(1, "GitHub username is required"),
  url: z.string().url("Invalid GitHub URL").nullable(),
});

// Create schemas
export const createGitProfileSchema = gitProfileSchema;

export const createYearlyStatsSchema = yearlyStatsSchema.omit({
  contributions: true,
  longestStreak: true,
  dates: true,
});

// Update schemas
export const updateGitProfileSchema = gitProfileSchema.partial();

export const updateYearlyStatsSchema = yearlyStatsSchema.partial();

// Response schemas
export const gitProfileResponseSchema = gitProfileSchema.extend({
  id: z.string().uuid(),
  userId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
  yearlyStats: z
    .array(
      yearlyStatsSchema.extend({
        id: z.string().uuid(),
        profileId: z.string().uuid(),
        createdAt: z.date(),
        updatedAt: z.date().nullable(),
      })
    )
    .optional(),
});

export const yearlyStatsResponseSchema = yearlyStatsSchema.extend({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});
