/* eslint-disable prettier/prettier */
import { getHtmlContent } from "@/lib/playwright";

export async function fetchGitStats(username: string, year: number = new Date().getFullYear()) {
  // use "getHtmlContent" to scrape stats
  const url = `https://github.com/${username}?tab=overview&from=${year}-01-01&to=${year}-12-31`;

  const [[htmlTitle], htmlGraphDots, htmlTooltips] = await Promise.all([
    getHtmlContent(url, {
      selectors: ["div[class='js-yearly-contributions'] h2"],
      selectorMode: "first",
      delayAfterLoad: 3000,
    }) as Promise<string[]>,
    getHtmlContent(url, {
      selectors: [".ContributionCalendar-grid .ContributionCalendar-day"],
      selectorMode: "all",
      delayAfterLoad: 3000,
    }) as Promise<string[]>,
    getHtmlContent(url, {
      selectors: ["tool-tip"],
      selectorMode: "all",
      delayAfterLoad: 3000,
    }) as Promise<string[]>,
  ]);

  // Extract total contributions from title
  const totalContributions = parseInt(
    htmlTitle.match(/(\d+(?:,\d+)*)\s+contributions/)![1].replace(/,/g, "")
  );

  // Extract daily stats from graph
  let dailyStats: Record<string, number> = {};

  htmlGraphDots.forEach((dotHtml) => {
    // Extract date and tooltip ID
    const dateMatch = dotHtml.match(/data-date="([^"]+)"/);
    const componentId = dotHtml.match(/id="([^"]+)"/);

    if (dateMatch && componentId) {
      const date = dateMatch[1];
      const tooltipFor = componentId[1];

      // Extract contribution count from tooltip text
      // Format: "X contributions on Month Day."
      const tooltipText =
        htmlTooltips
          .find((tooltip) => tooltip.match(/for="([^"]+)"/)?.[1] === tooltipFor)
          ?.match(/>([^"]+)<\//)?.[1] || "";

      const _countStr = tooltipText.split(" ")[0];
      const contributionCount = _countStr === "No" ? 0 : parseInt(_countStr, 10);
      dailyStats[date] = contributionCount;
    }
  });

  // sort daily stats by date
  const dates = Object.keys(dailyStats);
  dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // create new sorted object
  const sortedDailyStats = dates.reduce(
    (acc, date) => {
      acc[date] = dailyStats[date];
      return acc;
    },
    {} as Record<string, number>
  );

  console.log("dailyStats :>>", sortedDailyStats);

  // current streak
  let currentStreak = 0;
  const today = new Date().toISOString().split("T")[0];

  // Find the latest date with contributions
  const latestDate = dates.reduce((latest, date) => {
    if (date <= today && sortedDailyStats[date] > 0) {
      return date;
    }
    return latest;
  }, "");

  // Calculate current streak from the latest date backwards
  if (latestDate) {
    for (const date of dates) {
      if (date > latestDate) continue;
      if (sortedDailyStats[date] === 0) break;
      currentStreak++;
    }
  }

  // longest streak
  let longestStreak = 0;
  let currentCount = 0;

  for (const date of dates) {
    if (sortedDailyStats[date] > 0) {
      currentCount++;
      longestStreak = Math.max(longestStreak, currentCount);
    } else {
      currentCount = 0;
    }
  }

  return {
    year,
    totalContributions,
    currentStreak,
    longestStreak,
    dailyStats: sortedDailyStats,
  };
}
