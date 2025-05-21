const core = require("@actions/core");
const github = require("@actions/github");
const Linguci = require("./linguci");

async function run() {
  try {
    const linguci = new Linguci(process.env.GITHUB_WORKSPACE);

    linguci.readConfig().validateConfig();

    core.setOutput("status", "success");
  } catch (error) {
    core.setFailed(`Linguci action failed: ${error.message}`);
  }
}

run();
