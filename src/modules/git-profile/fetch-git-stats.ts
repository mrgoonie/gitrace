/* eslint-disable prettier/prettier */
import NodeCache from "node-cache";

import { getHtmlContent } from "@/lib/playwright";

// Cache for 1 hour
const statsCache = new NodeCache({ stdTTL: 3600 });

export async function fetchGitStats(username: string, year: number = new Date().getFullYear()) {
  const cacheKey = `${username}-${year}`;
  const cachedStats = statsCache.get(cacheKey);
  if (cachedStats) {
    return cachedStats as any;
  }

  const url = `https://github.com/${username}?tab=overview&from=${year}-01-01&to=${year}-12-31`;

  // Fetch all data in a single request with optimized selectors
  const selectors = [
    'div[class="js-yearly-contributions"] h2', // Title
    "img.avatar-user", // Avatar
    ".ContributionCalendar-grid .ContributionCalendar-day", // Graph dots
    "tool-tip", // Tooltips
  ];

  const htmlContent = await getHtmlContent(url, {
    selectors,
    selectorMode: "all",
    // Start with shorter delay and increase if needed
    delayAfterLoad: 1500,
    timeout: 60_000,
  });

  if (!htmlContent || !Array.isArray(htmlContent)) {
    throw new Error(`Failed to fetch GitHub stats for user: ${username}`);
  }

  // Destructure the results more efficiently with error handling
  const contributionsTitle = htmlContent.find((html) => html.includes("contributions"));
  const avatarElement = htmlContent.find((html) => html.includes("avatar-user"));
  const htmlGraphDots = htmlContent.filter((html) => html.includes("data-date"));
  const htmlTooltips = htmlContent.filter((html) => html.includes("tool-tip"));

  if (!contributionsTitle || !avatarElement) {
    throw new Error(`Failed to find required elements for user: ${username}`);
  }

  // Extract data using more efficient regex patterns with error handling
  const contributionsMatch = contributionsTitle.match(/(\d+(?:,\d+)*)\s+contributions/);
  if (!contributionsMatch) {
    throw new Error(`Failed to parse contributions count for user: ${username}`);
  }

  const totalContributions = parseInt(contributionsMatch[1].replace(/,/g, "") || "0");
  const avatarMatch = avatarElement.match(/src="([^"]+)"/);
  const avatarUrl = avatarMatch ? avatarMatch[1].replace(/s=64/, "s=200") : "";

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
}
