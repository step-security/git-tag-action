import * as core from "@actions/core";
import * as github from "@actions/github";
import { tag } from "./tag";
import axios, { isAxiosError } from "axios";

async function validateSubscription(): Promise<void> {
    const API_URL = `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/subscription`;

    try {
        await axios.get(API_URL, { timeout: 3000 });
    } catch (error) {
        if (isAxiosError(error) && error.response?.status === 403) {
            core.error("Subscription is not valid. Reach out to support@stepsecurity.io");
            process.exit(1);
        } else {
            core.info("Timeout or API not reachable. Continuing to next step.");
        }
    }
}

async function run(): Promise<void> {
    try {
        await validateSubscription();
        const token = core.getInput("github_token", {
            required: true
        });
        const octokit = github.getOctokit(token);
        const version: string = core.getInput("version", {
            required: true
        });
        const prefix: string = core.getInput("git_tag_prefix") ?? "";
        const git_commit_sha: string = core.getInput("git_commit_sha", {
            required: true
        });
        const github_repo: string = core.getInput("github_repo", {
            required: true
        });
        const [owner, repo] = github_repo.split("/");
        const gitTagName = `${prefix}${version}`;
        await tag(octokit, {
            owner,
            repo,
            gitName: github.context.actor,
            gitEmail: `${github.context.actor}@users.noreply.github.com`,
            gitTagName,
            gitCommitSha: git_commit_sha || github.context.sha,
            gitCommitMessage: `chore(release): ${gitTagName}`,
            gitDate: new Date().toISOString()
        });
    } catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}

run();
