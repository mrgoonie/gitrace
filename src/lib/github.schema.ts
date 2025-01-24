import { z } from "zod";

export const ContributionDaySchema = z.object({
  contributionCount: z.number(),
  date: z.string(), // YYYY-MM-DD format
});

export const ContributionWeekSchema = z.object({
  contributionDays: z.array(ContributionDaySchema),
});

export const ContributionCalendarSchema = z.object({
  totalContributions: z.number(),
  weeks: z.array(ContributionWeekSchema),
});

export const ContributionsCollectionSchema = z.object({
  totalCommitContributions: z.number(),
  totalIssueContributions: z.number(),
  totalPullRequestContributions: z.number(),
  totalPullRequestReviewContributions: z.number(),
  contributionCalendar: ContributionCalendarSchema,
});

export const GitHubContributionResponseSchema = z.object({
  user: z.object({
    contributionsCollection: ContributionsCollectionSchema,
  }),
});

export type GitHubContributionResponse = z.infer<typeof GitHubContributionResponseSchema>;
export type ContributionsCollection = z.infer<typeof ContributionsCollectionSchema>;
export type ContributionCalendar = z.infer<typeof ContributionCalendarSchema>;
export type ContributionWeek = z.infer<typeof ContributionWeekSchema>;
export type ContributionDay = z.infer<typeof ContributionDaySchema>;
