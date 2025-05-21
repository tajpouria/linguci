import core from "@actions/core";
import github from "@actions/github";
import Linguci from "./linguci.js";

async function run() {
  try {
    const linguci = new Linguci(process.env.GITHUB_WORKSPACE);

    linguci.readConfig().validateConfig().createTranslationBatches(5);

    console.log(linguci.translationBatches);
    console.log(linguci.translationPos);

    core.setOutput("status", "success");
  } catch (error) {
    core.setFailed(`Linguci action failed: ${error.message}`);
  }
}

run();
