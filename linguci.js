const { languageNames } = require("./utils");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

/**
 * Main class for handling linguci configuration
 */
class Linguci {
  /**
   * @param {string} workspace - The workspace directory path
   */
  constructor(workspace) {
    this.workspace = workspace;
  }

  /**
   * Reads and parses the linguci config file
   * @returns {Object} The parsed config (without validation)
   */
  readConfig() {
    // Check for linguci.yml or linguci.yaml
    let configPath;
    const ymlPath = path.join(this.workspace, "linguci.yml");
    const yamlPath = path.join(this.workspace, "linguci.yaml");

    if (fs.existsSync(ymlPath)) {
      configPath = ymlPath;
    } else if (fs.existsSync(yamlPath)) {
      configPath = yamlPath;
    } else {
      throw new Error(
        "Config file not found: linguci.yml or linguci.yaml must exist in workspace"
      );
    }

    // Read and parse the config file
    try {
      const fileContents = fs.readFileSync(configPath, "utf8");
      return yaml.load(fileContents);
    } catch (error) {
      throw new Error(`Error reading config file: ${error.message}`);
    }
  }

  /**
   * Validates the config object
   * @param {Object} config - The config object to validate
   * @param {Array<Object>} config.files - Array of file entries to process
   * @param {string} config.files[].source - Source file path
   * @param {string} config.files[].translation - Translation file path
   * @param {Array<string>} config.locales - Array of locale codes
   * @param {string} [config.base_path] - Optional base path for file references
   * @returns {void}
   */
  validateConfig(config) {
    // Check if files array exists and is not empty

    if (
      !config.files ||
      !Array.isArray(config.files) ||
      config.files.length === 0
    ) {
      throw new Error("Config must include a non-empty 'files' array");
    }

    // Check each file entry
    for (const file of config.files) {
      if (!file.source) {
        throw new Error("Each file entry must have a 'source' property");
      }

      if (!file.translation) {
        throw new Error("Each file entry must have a 'translation' property");
      }

      // Check if source file exists
      const sourcePath = path.join(
        config.base_path || this.workspace,
        file.source
      );
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source file does not exist: ${file.source}`);
      }
    }

    // Check locales
    if (
      !config.locales ||
      !Array.isArray(config.locales) ||
      config.locales.length === 0
    ) {
      throw new Error("Config must include a non-empty 'locales' array");
    }

    // Validate each locale
    for (const locale of config.locales) {
      if (!languageNames[locale]) {
        throw new Error(
          `Invalid locale code: ${locale}. Must be a key in languageNames.`
        );
      }
    }
  }
}

module.exports = Linguci;
