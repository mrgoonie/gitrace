import { Octokit } from "@octokit/rest";
import { z } from "zod";

import type { GitHubContributionResponse } from "./github.schema";
import { GitHubContributionResponseSchema } from "./github.schema";

// Validate GitHub token
const githubTokenSchema = z.string().min(1, "GitHub token is required");

// Initialize Octokit with token from env
const token = process.env.GITHUB_TOKEN;
githubTokenSchema.parse(token);

export const octokit = new Octokit({
  auth: token,
});

export async function checkGitHubProfile(username: string) {
  try {
    const response = await octokit.users.getByUsername({
      username,
    });

    return {
      exists: true,
      isPrivate: false, // Public profile
      data: response.data,
    };
  } catch (error: any) {
    if (error.status === 404) {
      return {
        exists: false,
        isPrivate: false,
        data: null,
      };
    }

    // Handle rate limiting
    if (error.status === 403) {
      throw new Error("GitHub API rate limit exceeded. Please try again later.");
    }

    throw error;
  }
}

export async function getContributionStats(
  username: string,
  year: number = new Date().getFullYear()
) {
  try {
    // Get contribution data using GraphQL API
    const query = `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
            totalIssueContributions
            totalPullRequestContributions
            totalPullRequestReviewContributions
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
        }
      }
    `;

    const from = new Date(year, 0, 1); // January 1st
    const to = new Date(year, 11, 31); // December 31st

    const response = await octokit.graphql<GitHubContributionResponse>(query, {
      username,
      from: from.toISOString(),
      to: to.toISOString(),
    });

    // Validate response with Zod schema
    const validatedResponse = GitHubContributionResponseSchema.parse(response);
    // console.log("getContributionStats() > Response:", JSON.stringify(validatedResponse, null, 2));

    return validatedResponse;
  } catch (error: any) {
    if (error.message.includes("Could not resolve to a User")) {
      throw new Error(`GitHub user ${username} not found`);
    }
    throw error;
  }
}
