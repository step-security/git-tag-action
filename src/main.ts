import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import { tag } from "./tag";
import axios, { isAxiosError } from "axios";

async function validateSubscription(): Promise<void> {
  const eventPath = process.env.GITHUB_EVENT_PATH
  let repoPrivate: boolean | undefined

  if (eventPath && fs.existsSync(eventPath)) {
    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'))
    repoPrivate = eventData?.repository?.private
  }

  const upstream = 'pkgdeps/git-tag-action'
  const action = process.env.GITHUB_ACTION_REPOSITORY
  const docsUrl =
    'https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions'

  core.info('')
  core.info('\u001b[1;36mStepSecurity Maintained Action\u001b[0m')
  core.info(`Secure drop-in replacement for ${upstream}`)
  if (repoPrivate === false)
    core.info('\u001b[32m\u2713 Free for public repositories\u001b[0m')
  core.info(`\u001b[36mLearn more:\u001b[0m ${docsUrl}`)
  core.info('')

  if (repoPrivate === false) return

  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com'
  const body: Record<string, string> = {action: action || ''}
  if (serverUrl !== 'https://github.com') body.ghes_server = serverUrl
  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body,
      {timeout: 3000}
    )
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      core.error(
        `\u001b[1;31mThis action requires a StepSecurity subscription for private repositories.\u001b[0m`
      )
      core.error(
        `\u001b[31mLearn how to enable a subscription: ${docsUrl}\u001b[0m`
      )
      process.exit(1)
    }
    core.info('Timeout or API not reachable. Continuing to next step.')
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
