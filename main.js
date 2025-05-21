import core from "@actions/core";
import github from "@actions/github";
import Linguci from "./linguci.js";

async function run() {
  try {
    const linguci = new Linguci(process.env.GITHUB_WORKSPACE);

    await linguci
      .readConfig()
      .validateConfig()
      .createTranslationBatches({ batchSize: 5 })
      .executeTranslations()
      .then(instance => instance.writeTranslations());

    console.log(linguci.translationBatches);
    console.log(linguci.translationPos);

    core.setOutput("status", "success");
  } catch (error) {
    core.setFailed(`Linguci action failed: ${error.message}`);
  }
}

run();
