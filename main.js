import core from "@actions/core";
import github from "@actions/github";
import Linguci from "./linguci.js";

import { zodToJsonSchema } from "zod-to-json-schema";

async function run() {
  try {
    // Read inputs from GitHub Actions
    const batchSize = parseInt(core.getInput("batch_size"), 10);
    const languageConcurrency = parseInt(
      core.getInput("language_concurrency"),
      10
    );
    const maxRetries = parseInt(core.getInput("max_retries"), 10);
    const retryDelay = parseInt(core.getInput("retry_delay"), 10);
    const branchPrefix = core.getInput("branch_prefix");
    const prTitle = core.getInput("pr_title");
    const prBody = core.getInput("pr_body");

    const linguci = new Linguci();

    await linguci
      .readConfig()
      .validateConfig()
      .createTranslationBatches({ batchSize })
      .executeTranslations({
        languageConcurrency,
        maxRetries,
        retryDelay,
      })
      .then((instance) => instance.writeTranslations())
      .then((instance) => instance.commitChanges())
      .then((instance) =>
        instance.createPullRequest({
          branchPrefix,
          prTitle,
          prBody,
        })
      );

    core.setOutput("status", "success");
  } catch (error) {
    core.setFailed(`Linguci action failed: ${error.message}`);
  }
}

run();
