/* eslint-disable prettier/prettier */
import NodeCache from "node-cache";

import { getHtmlContent } from "@/lib/playwright";

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
    return cachedStats as any;
  }

  const url = `https://github.com/${username}?tab=overview&from=${year}-01-01&to=${year}-12-31`;

  // Updated selectors to match GitHub's latest DOM structure
  const selectors = [
    // Title - multiple possible selectors
    "h2.js-yearly-contributions",
    "div.js-yearly-contributions h2",
    // Avatar - try multiple selectors
    'img[alt*="Avatar"]',
    "img.avatar",
    "img.avatar-user",
    'a[itemprop="image"] img',
    'img[itemprop="image"]',
    // Graph dots
    "[data-date]",
    // Tooltips
    "tool-tip",
  ];

  try {
    const htmlContent = await getHtmlContent(url, {
      selectors,
      selectorMode: "all",
      delayAfterLoad: 2500, // Increased delay further
      timeout: 60_000,
      // debug: true,
    });

    if (!htmlContent || !Array.isArray(htmlContent)) {
      throw new Error(`Failed to fetch GitHub stats for user: ${username}`);
    }

    // Find elements with more flexible matching
    const contributionsTitle = htmlContent.find(
      (html) =>
        html.includes("contributions") &&
        (html.includes("js-yearly-contributions") || html.includes("<h2"))
    );

    // More flexible avatar matching
    const avatarElement = htmlContent.find(
      (html) =>
        html.includes("img") &&
        (html.includes("avatar") ||
          html.includes(`alt="${username}"`) ||
          html.includes(`alt="@${username}"`) ||
          html.includes('itemprop="image"'))
    );

    const htmlGraphDots = htmlContent.filter((html) => html.includes("data-date"));
    const htmlTooltips = htmlContent.filter((html) => html.includes("tool-tip"));

    // Log debug info
    if (options?.debug)
      console.log(`[GitStats Debug] ${username} - Found elements:`, {
        hasTitle: !!contributionsTitle,
        hasAvatar: !!avatarElement,
        graphDotsCount: htmlGraphDots.length,
        tooltipsCount: htmlTooltips.length,
        titleContent: contributionsTitle,
        avatarContent: avatarElement,
      });

    // Only require title, make avatar optional
    if (!contributionsTitle) {
      throw new Error(
        `Failed to find contributions data for user: ${username}. ` +
          `This usually means the profile doesn't exist or is private.`
      );
    }

    // Extract data using more efficient regex patterns with error handling
    const contributionsMatch = contributionsTitle.match(/(\d+(?:,\d+)*)\s+contributions?/);
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
    const tooltipMap = new Map(
      htmlTooltips.map((tooltip) => {
        const forMatch = tooltip.match(/for="([^"]+)"/);
        const textMatch = tooltip.match(/>([^<]+)</);
        return [forMatch?.[1], textMatch?.[1]?.trim()];
      })
    );

    htmlGraphDots.forEach((dotHtml) => {
      const dateMatch = dotHtml.match(/data-date="([^"]+)"/);
      const componentId = dotHtml.match(/id="([^"]+)"/);

      if (dateMatch?.[1] && componentId?.[1]) {
        const date = dateMatch[1];
        const tooltipText = tooltipMap.get(componentId[1]) || "No contributions";
        dailyStats[date] =
          tooltipText === "No contributions" ? 0 : parseInt(tooltipText.split(" ")[0]) || 0;
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

    const result = {
      username,
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
