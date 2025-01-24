/* eslint-disable prettier/prettier */
import NodeCache from "node-cache";

import { getHtmlContent } from "@/lib/playwright";

import type { GitStats } from "./schema";

// Cache for 1 hour
const statsCache = new NodeCache({ stdTTL: 3600 });

export async function fetchGitStats(
  username: string,
  year: number = new Date().getFullYear(),
  options?: { debug: boolean }
) {
  const cacheKey = `${username}-${year}`;
  const cachedStats = statsCache.get(cacheKey);
  if (cachedStats) {
    return cachedStats as GitStats;
  }

  const url = `https://github.com/${username}?tab=overview&from=${year}-01-01&to=${year}-12-31`;

  try {
    const html = await getHtmlContent(url, {
      debug: false, // Always enable debug for now
      delayAfterLoad: 5000, // Increase to 10s
      timeout: 60000, // Increase to 60s
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!html || Array.isArray(html)) {
      throw new Error(`Failed to fetch HTML content for user: ${username}`);
    }

    if (options?.debug) {
      console.log(`[GitStats Debug] Raw HTML length for ${username}:`, html.length);
      console.log(`[GitStats Debug] Raw HTML content for ${username}:`, html.slice(0, 500)); // Log first 500 chars
    }

    // Updated regex patterns for GitHub's current structure
    const contributionsTitle =
      html.match(/class="js-yearly-contributions"[^>]*>.*?<h2[^>]*>([^<]+)<\/h2>/is)?.[1]?.trim() ||
      html.match(/class="ContributionCalendar-label"[^>]*>([^<]+)<\/h2>/is)?.[1]?.trim();
    const avatarElement = html.match(/<img[^>]*class="[^"]*avatar[^"]*"[^>]*>/i)?.[0];

    // Updated selectors for contribution graph
    const htmlGraphDots =
      html.match(
        /<td[^>]*data-level="[^"]*"[^>]*>|<rect[^>]*class="ContributionCalendar-day[^"]*"[^>]*>/gi
      ) || [];
    const htmlTooltips =
      html.match(
        /data-count="(\d+)[^"]*"[^>]*data-date="([^"]+)"|data-level="[^"]*"[^>]*data-date="([^"]+)"/gi
      ) || [];

    if (options?.debug) {
      console.log(`[GitStats Debug] ${username} - Found elements:`, {
        hasTitle: !!contributionsTitle,
        hasAvatar: !!avatarElement,
        graphDotsCount: htmlGraphDots.length,
        tooltipsCount: htmlTooltips.length,
        titleContent: contributionsTitle,
        avatarContent: avatarElement?.slice(0, 100), // Show first 100 chars of avatar element
      });
    }

    // Check for required elements
    const missingElements = [];
    if (!contributionsTitle) missingElements.push("contributions title");
    if (!avatarElement) missingElements.push("avatar");
    if (htmlGraphDots.length === 0) missingElements.push("contribution graph");

    if (missingElements.length > 0) {
      throw new Error(
        `Failed to find ${missingElements.join(
          ", "
        )} for user: ${username}. This usually means the profile doesn't exist or is private.`
      );
    }

    // Extract data using more efficient regex patterns with error handling
    const contributionsMatch = contributionsTitle?.match(/(\d+(?:,\d+)*)\s+contributions?/);
    if (!contributionsMatch) {
      console.log(`[GitStats Debug] ${username} - Title content:`, contributionsTitle);
      throw new Error(`Failed to parse contributions count for user: ${username}`);
    }

    const totalContributions = parseInt(contributionsMatch[1].replace(/,/g, "") || "0");

    // Get avatar URL with fallback
    let avatarUrl = "";
    if (avatarElement) {
      const avatarMatch = avatarElement.match(/src="([^"]+)"/);
      if (avatarMatch) {
        avatarUrl = avatarMatch[1].replace(/\?.*$/, "").replace(/s=\d+/, "s=200");
      }
    }
    // Fallback to GitHub's default avatar if none found
    if (!avatarUrl) {
      avatarUrl = `https://avatars.githubusercontent.com/u/${username}?v=4&s=200`;
    }

    // Process daily stats more efficiently
    const dailyStats: Record<string, number> = {};
    // const tooltipMap = new Map(
    //   htmlTooltips.map((tooltip) => {
    //     const forMatch = tooltip.match(/data-date="([^"]+)"/);
    //     const textMatch = tooltip.match(/data-count="(\d+)"/);
    //     return [forMatch?.[1], textMatch?.[1]];
    //   })
    // );

    htmlGraphDots.forEach((dotHtml) => {
      const dateMatch = dotHtml.match(/data-date="([^"]+)"/);
      const countMatch = dotHtml.match(/data-count="(\d+)"/);

      if (dateMatch?.[1] && countMatch?.[1]) {
        const date = dateMatch[1];
        const count = parseInt(countMatch[1]);
        dailyStats[date] = count;
      }
    });

    // Sort dates more efficiently
    const dates = Object.keys(dailyStats).sort();
    const sortedDailyStats = Object.fromEntries(dates.map((date) => [date, dailyStats[date]]));

    const today = new Date().toISOString().split("T")[0];
    const latestDate = dates.reduce(
      (latest, date) => (date <= today && sortedDailyStats[date] > 0 ? date : latest),
      ""
    );

    // Calculate streaks more efficiently
    let currentStreak = 0;
    if (latestDate) {
      const latestDateObj = new Date(latestDate);
      const todayObj = new Date(today);
      const diffDays = Math.floor(
        (todayObj.getTime() - latestDateObj.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays <= 1) {
        for (let i = dates.indexOf(latestDate); i >= 0; i--) {
          if (sortedDailyStats[dates[i]] === 0) break;
          currentStreak++;
        }
      }
    }

    // Calculate longest streak more efficiently
    let longestStreak = 0;
    let currentCount = 0;
    dates.forEach((date) => {
      if (sortedDailyStats[date] > 0) {
        currentCount++;
        longestStreak = Math.max(longestStreak, currentCount);
      } else {
        currentCount = 0;
      }
    });

    const result: GitStats = {
      username,
      url,
      year,
      totalContributions,
      avatarUrl,
      dailyStats: sortedDailyStats,
      currentStreak,
      longestStreak,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the results
    statsCache.set(cacheKey, result);

    return result;
  } catch (error) {
    // Add more context to the error
    console.error(`[GitStats Error] Failed to fetch stats for ${username}:`, error);
    throw error;
  }
}
