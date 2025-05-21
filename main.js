import core from "@actions/core";
import github from "@actions/github";
import Linguci from "./linguci.js";

import { zodToJsonSchema } from "zod-to-json-schema";

async function run() {
  try {
    const linguci = new Linguci();

    await linguci
      .readConfig()
      .validateConfig()
      .createTranslationBatches({ batchSize: 20 })
      .executeTranslations({
        languageConcurrency: 2,
      })
      .then((instance) => instance.writeTranslations());

    core.setOutput("status", "success");
  } catch (error) {
    core.setFailed(`Linguci action failed: ${error.message}`);
  }
}

run();
