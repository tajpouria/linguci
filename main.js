const core = require("@actions/core");
const github = require("@actions/github");
const Linguci = require("./linguci");

// Main function to run the action
async function run() {
  try {
    // Initialize Linguci with the GitHub workspace
    const linguci = new Linguci(process.env.GITHUB_WORKSPACE);

    console.log("Reading linguci configuration...");
    const config = linguci.readConfig();

    console.log("Validating linguci configuration...");
    linguci.validateConfig(config);

    console.log("Configuration is valid!");

    // Process files according to the configuration
    console.log(
      `Processing ${config.files.length} files for ${config.locales.length} locales...`
    );

    // TODO: Implement actual translation processing logic here
    // This would depend on the specific requirements of the action

    core.setOutput("status", "success");
    console.log("Linguci action completed successfully!");
  } catch (error) {
    core.setFailed(`Linguci action failed: ${error.message}`);
  }
}

// Run the action
run();
