/* eslint-disable prettier/prettier */
import NodeCache from "node-cache";

import { checkGitHubProfile, getContributionStats } from "@/lib/github";

import type { GitStats } from "./schema";

// Cache for 1 hour
const statsCache = new NodeCache({ stdTTL: 3600 });

export async function fetchGitStats(
  username: string,
  year: number = new Date().getFullYear(),
  options?: { debug: boolean }
): Promise<GitStats> {
  const cacheKey = `${username}-${year}`;
  const cachedStats = statsCache.get(cacheKey);
  if (cachedStats) {
    return cachedStats as GitStats;
  }

  try {
    // First check if profile exists and is accessible
    const profileCheck = await checkGitHubProfile(username);

    if (!profileCheck.exists) {
      throw new Error(
        `GitHub user ${username} not found. Please check the username and try again.`
      );
    }

    if (profileCheck.isPrivate) {
      throw new Error(
        `GitHub user ${username} has a private profile. Unable to fetch contribution data.`
      );
    }

    // Fetch github profile description
    const description = profileCheck.data?.bio;

    // Fetch contribution stats using GitHub API
    const stats = await getContributionStats(username, year);

    if (!stats.user?.contributionsCollection) {
      throw new Error(`Failed to fetch contribution data for user: ${username}`);
    }

    const { contributionsCollection } = stats.user;
    const totalContributions = contributionsCollection.contributionCalendar.totalContributions;

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const today = new Date().toISOString().split("T")[0];

    // Transform daily stats into a record and calculate streaks
    const dailyStatsRecord: Record<string, number> = {};
    contributionsCollection.contributionCalendar.weeks.flatMap((week: any) =>
      week.contributionDays.forEach((day: any) => {
        // Only add stats for the requested year
        const dateYear = new Date(day.date).getFullYear();
        if (dateYear === year) {
          dailyStatsRecord[day.date] = day.contributionCount;

          if (day.contributionCount > 0) {
            tempStreak++;
            if (day.date === today) {
              currentStreak = tempStreak;
            }
          } else {
            if (tempStreak > longestStreak) {
              longestStreak = tempStreak;
            }
            tempStreak = 0;
          }
        }
      })
    );

    // Update longest streak if the current streak is the longest
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    // Create GitStats object
    const gitStats: GitStats = {
      username,
      description,
      year,
      url: `https://github.com/${username}`,
      totalContributions,
      avatarUrl: profileCheck.data?.avatar_url,
      dailyStats: dailyStatsRecord, // This is now properly included
      currentStreak,
      longestStreak,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the results
    statsCache.set(cacheKey, gitStats);

    return gitStats;
  } catch (error: any) {
    if (options?.debug) {
      console.error("Error fetching git stats:", error);
    }
    throw error;
  }
}
