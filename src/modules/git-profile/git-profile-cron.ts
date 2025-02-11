import dayjs from "dayjs";
import cron from "node-cron";

import { prisma } from "@/lib/db";
import {
  type CreateYearlyStatsSchema,
  createYearlyStatsSchema,
} from "@/schemas/git-profile-schemas";

import { fetchGitStats } from "./fetch-git-stats";
import { createYearlyStats, updateYearlyStats } from "./git-profile-crud";

// Process a few profiles at a time to avoid overloading Playwright
const batchSize = 10;

async function updateGitStats() {
  console.log(`--------- UPDATING STATS ${dayjs().format("YYYY-MM-DD HH:mm:ss")} ---------`);
  try {
    // Get all git profiles
    const profiles = await prisma.gitProfile.findMany({
      include: {
        yearlyStats: {
          where: {
            year: new Date().getFullYear(),
          },
        },
      },
    });

    // Process each profile in parallel with rate limiting
    for (let i = 0; i < profiles.length; i += batchSize) {
      const batch = profiles.slice(i, i + batchSize);

      // Process batch in parallel
      await Promise.all(
        batch.map(async (profile) => {
          try {
            const currentYear = new Date().getFullYear();
            const stats = await fetchGitStats(profile.username, currentYear, { debug: false });

            // Update git profile if anything changed
            if (stats.url !== profile.url || stats.avatarUrl !== profile.avatar) {
              await prisma.gitProfile.update({
                where: { id: profile.id },
                data: {
                  url: stats.url,
                  avatar: stats.avatarUrl,
                },
              });
              console.log(`Updated git profile for ${profile.username}`);
            }

            // Convert stats to match our schema
            const input: CreateYearlyStatsSchema = createYearlyStatsSchema.parse({
              year: currentYear,
              contributions: stats.totalContributions,
              longestStreak: stats.longestStreak,
              currentStreak: stats.currentStreak,
              dates: stats.dailyStats,
            });

            // Update or create yearly stats
            if (profile.yearlyStats.length > 0) {
              await updateYearlyStats(profile.yearlyStats[0].id, input);
              console.log(`Updated stats for ${profile.username}`);
            } else {
              await createYearlyStats(profile.id, input, profile.userId ?? undefined);
              console.log(`Created stats for ${profile.username}`);
            }
          } catch (error) {
            console.error(`Failed to update stats for ${profile.username}:`, error);
          }
        })
      );

      // Add a delay between batches to avoid overloading
      if (i + batchSize < profiles.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error("[SKIP] Failed to update git stats:", error);
  }
}

// Schedule cron job to run every 5 minutes
export function startGitStatsCron() {
  console.log("Starting git stats cron job...");
  cron.schedule("*/5 * * * *", updateGitStats);
  updateGitStats();
}
