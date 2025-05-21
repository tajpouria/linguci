import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import gettextParser from "gettext-parser";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";

/**
 * Main class for handling linguci configuration
 */
class Linguci {
  /**
   * Log levels
   * @type {Object}
   */
  LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4,
  };

  /**
   * Current log level
   * @type {number}
   */
  logLevel = this.LOG_LEVELS.INFO;

  /**
   * ANSI color codes for different log levels
   * @type {Object}
   */
  LOG_COLORS = {
    DEBUG: "\x1b[36m", // Cyan
    INFO: "\x1b[32m", // Green
    WARN: "\x1b[33m", // Yellow
    ERROR: "\x1b[31m", // Red
    RESET: "\x1b[0m", // Reset
  };

  /**
   * Log a message with the specified level
   * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
   * @param {string} message - The message to log
   */
  log(level, message) {
    // Skip if message level is below current log level
    if (this.LOG_LEVELS[level] < this.logLevel) {
      return;
    }

    const color = this.LOG_COLORS[level] || "";
    const resetColor = this.LOG_COLORS.RESET;
    const formattedMessage = `${color}[${level}]${resetColor} ${message}`;

    switch (level) {
      case "ERROR":
        console.error(formattedMessage);
        break;
      case "WARN":
        console.warn(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
        break;
    }
  }

  /**
   * Set the log level
   * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR, NONE)
   */
  setLogLevel(level) {
    if (this.LOG_LEVELS[level] !== undefined) {
      this.logLevel = this.LOG_LEVELS[level];
    } else {
      this.log("ERROR", `Invalid log level: ${level}`);
    }
  }

  /**
   * Map of language codes to their names in different languages
   * @type {Object<string, string[]>}
   */
  languageNames = {
    "af-ZA": ["Afrikaans", "Afrikaans"],
    ar: ["العربية", "Arabic"],
    "bg-BG": ["Български", "Bulgarian"],
    "ca-AD": ["Català", "Catalan"],
    "cs-CZ": ["Čeština", "Czech"],
    "cy-GB": ["Cymraeg", "Welsh"],
    "da-DK": ["Dansk", "Danish"],
    "de-AT": ["Deutsch (Österreich)", "German (Austria)"],
    "de-CH": ["Deutsch (Schweiz)", "German (Switzerland)"],
    "de-DE": ["Deutsch (Deutschland)", "German (Germany)"],
    "el-GR": ["Ελληνικά", "Greek"],
    "en-GB": ["English (UK)", "English (UK)"],
    "en-US": ["English (US)", "English (US)"],
    "es-CL": ["Español (Chile)", "Spanish (Chile)"],
    "es-ES": ["Español (España)", "Spanish (Spain)"],
    "es-MX": ["Español (México)", "Spanish (Mexico)"],
    "et-EE": ["Eesti keel", "Estonian"],
    eu: ["Euskara", "Basque"],
    "fa-IR": ["فارسی", "Persian"],
    "fi-FI": ["Suomi", "Finnish"],
    "fr-CA": ["Français (Canada)", "French (Canada)"],
    "fr-FR": ["Français (France)", "French (France)"],
    "gl-ES": ["Galego (Spain)", "Galician (Spain)"],
    "he-IL": ["עברית", "Hebrew"],
    "hi-IN": ["हिंदी", "Hindi"],
    "hr-HR": ["Hrvatski", "Croatian"],
    "hu-HU": ["Magyar", "Hungarian"],
    "id-ID": ["Bahasa Indonesia", "Indonesian"],
    "is-IS": ["Íslenska", "Icelandic"],
    "it-IT": ["Italiano", "Italian"],
    "ja-JP": ["日本語", "Japanese"],
    "km-KH": ["ភាសាខ្មែរ", "Khmer"],
    "ko-KR": ["한국어", "Korean"],
    la: ["Latina", "Latin"],
    "lt-LT": ["Lietuvių kalba", "Lithuanian"],
    "lv-LV": ["Latviešu", "Latvian"],
    "mn-MN": ["Монгол", "Mongolian"],
    "nb-NO": ["Norsk bokmål", "Norwegian (Bokmål)"],
    "nl-NL": ["Nederlands", "Dutch"],
    "nn-NO": ["Norsk nynorsk", "Norwegian (Nynorsk)"],
    "pa-PK": ["پنجابی (شاہ‌مکھی)", "Punjabi (Shahmukhi)"],
    "pl-PL": ["Polski", "Polish"],
    "pt-BR": ["Português (Brasil)", "Portuguese (Brazil)"],
    "pt-PT": ["Português (Portugal)", "Portuguese (Portugal)"],
    "ro-RO": ["Română", "Romanian"],
    "ru-RU": ["Русский", "Russian"],
    "sk-SK": ["Slovenčina", "Slovak"],
    "sl-SI": ["Slovenščina", "Slovenian"],
    "sr-RS": ["Српски / Srpski", "Serbian"],
    "sv-SE": ["Svenska", "Swedish"],
    "th-TH": ["ไทย", "Thai"],
    "tr-TR": ["Türkçe", "Turkish"],
    "uk-UA": ["Українська", "Ukrainian"],
    "vi-VN": ["Tiếng Việt", "Vietnamese"],
    "zh-CN": ["中文 (中国大陆)", "Chinese (PRC)"],
    "zh-TW": ["中文 (台灣)", "Chinese (Taiwan)"],
  };

  /**
   * Get the model for the given provider
   * @param {Object} options - The options object
   * @param {string} options.provider - The provider name
   * @param {string} options.model - The model name
   * @returns {Object} The model object
   */
  getModel({ provider, model }) {
    const models = {
      "google-generative-ai": () =>
        google(model, {
          structuredOutputs: false,
        }),
    };

    const modelFactory = models[provider];
    if (!modelFactory) {
      throw new Error(
        `Unsupported provider: ${provider}, supported providers: ${Object.keys(
          models
        ).join(", ")}`
      );
    }

    return modelFactory();
  }

  /**
   * The workspace directory path
   * @type {string}
   */
  workspace = ".";

  /**
   * The parsed configuration object from linguci.yml/yaml
   * @type {Object}
   * @property {Array<{source: string, translation: string}>} files - List of files to be translated, each with source and translation paths
   * @property {string[]} locales - List of target locale codes that must be valid language keys
   * @property {string} base_path - Base path for file resolution
   */
  config = {};

  /**
   * Storage for translation batches organized by file, locale, and context
   * @type {Object<string, Object<string, Object<string, Object<number, Object>>>>}
   * @property {Object<string, Object<string, Object<number, Object>>>} [sourcePath] - Key is source file path
   * @property {Object<string, Object<number, Object>>} [sourcePath.translationPath] - Key is translation file path
   * @property {Object<number, Object>} [sourcePath.translationPath.contextKey] - Key is context name
   * @property {Object} [sourcePath.translationPath.contextKey.batchNumber] - Zod schema for validating translations
   */
  translationBatches = {};

  /**
   * Storage for translation PO objects organized by file and locale
   * @type {Object<string, Object<string, Object>>}
   * @property {Object<string, Object>} [sourcePath] - Key is source file path
   * @property {Object} [sourcePath.translationPath] - Key is translation file path, value is PO object
   */
  translationPos = {};

  /**
   * Constructor
   * @param {Object} options - The options object
   * @param {string} options.workspace - The workspace directory path
   * @param {string} options.logLevel - The log level (DEBUG, INFO, WARN, ERROR, NONE)
   */
  constructor({ workspace = ".", logLevel = "DEBUG" } = {}) {
    this.workspace = workspace;
    this.setLogLevel(logLevel);
  }

  /**
   * Reads and parses the linguci config file
   * @returns {Linguci} this instance for chaining
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

    try {
      const fileContents = fs.readFileSync(configPath, "utf8");
      this.config = yaml.load(fileContents);
      return this;
    } catch (error) {
      throw new Error(`Error reading config file: ${error.message}`);
    }
  }

  /**
   * Validates the config object
   * @returns {Linguci} this instance for chaining
   */
  validateConfig() {
    if (!this.config) {
      throw new Error("No configuration loaded. Call readConfig() first.");
    }

    const config = this.config;

    if (!config.base_path) {
      config.base_path = this.workspace;
    }

    if (
      !config.locales ||
      !Array.isArray(config.locales) ||
      config.locales.length === 0
    ) {
      throw new Error("Config must include a non-empty 'locales' array");
    }

    for (const locale of config.locales) {
      if (!this.languageNames[locale]) {
        throw new Error(
          `Invalid locale code: ${locale}. Must be a key in languageNames: ${Object.keys(
            this.languageNames
          ).join(", ")}`
        );
      }
    }

    if (
      !config.files ||
      !Array.isArray(config.files) ||
      config.files.length === 0
    ) {
      throw new Error("Config must include a non-empty 'files' array");
    }

    for (const file of config.files) {
      if (!file.source) {
        throw new Error("Each file entry must have a 'source' property");
      }

      if (!file.translation) {
        throw new Error("Each file entry must have a 'translation' property");
      }

      const sourcePath = path.join(config.base_path, file.source);
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source file does not exist: ${file.source}`);
      }

      if (file.translation.includes("%locale%")) {
        const nonExistentTranslationPaths = [];
        for (const locale of config.locales) {
          const translationPath = path.join(
            config.base_path,
            file.translation.replace("%locale%", locale)
          );
          if (!fs.existsSync(translationPath)) {
            nonExistentTranslationPaths.push(translationPath);
          }
        }
        if (nonExistentTranslationPaths.length > 0) {
          throw new Error(
            `Translation file does not exist: ${nonExistentTranslationPaths.join(
              ", "
            )}`
          );
        }
      } else {
        if (!fs.existsSync(file.translation)) {
          throw new Error(
            `Translation file does not exist: ${file.translation}`
          );
        }
      }
    }

    // Validate the model
    this.getModel(this.config.llm);

    return this;
  }

  /**
   * Creates batches of translation entries that need to be translated
   * Processes all source and translation files defined in the config
   * Organizes entries by source file, translation file, context and batch number
   * Uses Zod schemas to validate translations
   *
   * @param {Object} options - Configuration options
   * @param {number} [options.batchSize=20] - Number of entries per batch
   * @returns {Linguci} this instance for chaining
   */
  createTranslationBatches({ batchSize = 20 }) {
    for (const file of this.config.files) {
      const sourcePath = path.join(this.config.base_path, file.source);
      const sourcePo = this._processSourceFile(sourcePath);

      // Extract source locale from source file path if possible
      const sourceLocale = this.config.locales.find((locale) =>
        file.source.includes(locale)
      );

      for (const locale of this.config.locales) {
        // Skip if this locale is the source locale
        if (locale === sourceLocale) continue;

        // Handle %locale% placeholder in translation path
        const translationPath = this._getTranslationPath(
          file.translation,
          locale
        );

        // Skip if translation file doesn't exist
        if (!fs.existsSync(translationPath)) {
          console.warn(`Translation file not found: ${translationPath}`);
          continue;
        }

        const translationPo = this._processTranslationFile(
          sourcePath,
          translationPath,
          sourcePo
        );

        // Find entries that need translation
        const emptyMsgStrs = this._findEntriesNeedingTranslation(translationPo);

        // Create schema batches for this file and locale
        const schemaBatches = this._createSchemaBatches(
          emptyMsgStrs,
          batchSize
        );

        // Store batches for this file and translation path
        this.translationBatches[sourcePath][translationPath] = schemaBatches;
      }
    }

    return this;
  }

  /**
   * Executes translations for all batches and updates PO files
   * @param {Object} options - Configuration options
   * @param {number} [options.languageConcurrency=1] - Number of languages to translate concurrently
   * @param {number} [options.maxRetries=3] - Maximum number of retry attempts for failed translations
   * @param {number} [options.retryDelay=1000] - Delay between retries in milliseconds
   * @returns {Promise<Linguci>} this instance for chaining
   */
  async executeTranslations({
    languageConcurrency = 1,
    maxRetries = 3,
    retryDelay = 1000,
  } = {}) {
    this.log(
      "DEBUG",
      `Starting translation process with options: languageConcurrency=${languageConcurrency}, maxRetries=${maxRetries}, retryDelay=${retryDelay}ms`
    );

    // Get model from config
    const model = this.getModel(this.config.llm);
    this.log(
      "DEBUG",
      `Using model: ${this.config.llm.provider}/${this.config.llm.model}`
    );

    // Create a queue of translation tasks
    const translationTasks = [];

    // Build tasks for all translation paths and their batches
    for (const sourcePath in this.translationBatches) {
      this.log("DEBUG", `Processing source file: ${sourcePath}`);

      for (const translationPath in this.translationBatches[sourcePath]) {
        // Extract locale from translation path
        const locale = this._extractLocaleFromPath(translationPath);
        const language = this.languageNames[locale] || locale;

        this.log(
          "DEBUG",
          `Processing translation for locale: ${locale} (${language}), file: ${translationPath}`
        );

        // Get the PO object for this translation
        const translationPo = this.translationPos[sourcePath][translationPath];

        // Process each context and its batches
        for (const contextKey in this.translationBatches[sourcePath][
          translationPath
        ]) {
          const contextBatches =
            this.translationBatches[sourcePath][translationPath][contextKey];
          const batchCount = Object.keys(contextBatches).length;

          this.log(
            "DEBUG",
            `Context '${contextKey}' has ${batchCount} batches to translate`
          );

          // Add each batch as a task
          for (const batchNumber in contextBatches) {
            const schema = contextBatches[batchNumber];
            const messageCount = Object.keys(schema.shape).length;

            this.log(
              "DEBUG",
              `Adding batch #${batchNumber} with ${messageCount} messages for translation`
            );

            translationTasks.push({
              sourcePath,
              translationPath,
              contextKey,
              batchNumber,
              schema,
              language,
              locale,
              translationPo,
              messageCount,
            });
          }
        }
      }
    }

    this.log(
      "DEBUG",
      `Created ${translationTasks.length} translation tasks in total`
    );

    // Process translation tasks with concurrency limit
    const executeTask = async (task) => {
      const {
        sourcePath,
        translationPath,
        contextKey,
        batchNumber,
        schema,
        language,
        translationPo,
        messageCount,
      } = task;

      this.log(
        "DEBUG",
        `Starting translation task: ${translationPath}, context '${contextKey}', batch #${batchNumber} (${messageCount} messages to ${language})`
      );

      let retries = 0;
      let success = false;
      let object;

      // Retry loop
      while (!success && retries <= maxRetries) {
        try {
          this.log(
            "DEBUG",
            `Sending translation request for batch #${batchNumber} to ${language}`
          );

          const startTime = Date.now();
          const result = await generateObject({
            model,
            prompt: `Translate the following keys word by word to ${language}. Keep the original format and only translate the text values. Do not add any formatting or explanations.`,
            schema,
          });
          object = result.object;
          const endTime = Date.now();

          const translationKeys = Object.keys(object).join(", ");
          this.log(
            "DEBUG",
            `Translation successful for batch #${batchNumber} (${
              endTime - startTime
            }ms)`
          );
          this.log("DEBUG", `Translated keys: ${translationKeys}`);

          success = true;
        } catch (error) {
          retries++;
          this.log(
            "ERROR",
            `Translation failed for ${translationPath}, context ${contextKey}, batch ${batchNumber}. Retry ${retries}/${maxRetries}`
          );
          this.log("ERROR", `Error details: ${error.message}`);

          if (retries <= maxRetries) {
            // Wait before retrying
            this.log(
              "DEBUG",
              `Waiting ${retryDelay}ms before retry #${retries}`
            );
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          } else {
            this.log(
              "ERROR",
              `Max retries exceeded for ${translationPath}, context ${contextKey}, batch ${batchNumber}`
            );
            throw error;
          }
        }
      }

      // Update the PO object with translations
      if (success && object) {
        this.log(
          "DEBUG",
          `Updating PO object for ${translationPath}, context '${contextKey}'`
        );
        this._updateTranslationPoWithResults(translationPo, contextKey, object);
        this.log(
          "DEBUG",
          `PO object updated successfully with ${
            Object.keys(object).length
          } translations`
        );
      }

      return { success, sourcePath, translationPath };
    };

    // Process tasks with concurrency
    const processTasks = async (tasks) => {
      const results = [];

      // Process in chunks based on language concurrency
      for (let i = 0; i < tasks.length; i += languageConcurrency) {
        const chunk = tasks.slice(i, i + languageConcurrency);
        this.log(
          "DEBUG",
          `Processing chunk ${
            Math.floor(i / languageConcurrency) + 1
          }/${Math.ceil(tasks.length / languageConcurrency)} with ${
            chunk.length
          } tasks`
        );

        const chunkPromises = chunk.map((task) => executeTask(task));

        const chunkResults = await Promise.allSettled(chunkPromises);
        results.push(...chunkResults);

        this.log(
          "DEBUG",
          `Completed chunk ${
            Math.floor(i / languageConcurrency) + 1
          }/${Math.ceil(tasks.length / languageConcurrency)}`
        );
      }

      return results;
    };

    // Execute all translation tasks
    this.log("DEBUG", `Beginning execution of all translation tasks`);
    const results = await processTasks(translationTasks);

    // Log summary
    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value?.success
    ).length;
    const failed = results.length - successful;

    this.log("DEBUG", `Translation process complete`);
    this.log(
      "INFO",
      `Translation summary: ${successful} successful, ${failed} failed`
    );

    // Note: No longer writing to files, only updating PO objects in memory
    this.log(
      "DEBUG",
      `PO objects updated in memory only, no files were written`
    );

    return this;
  }

  /**
   * Writes the translated PO objects to their respective files
   * @param {Object} options - Configuration options
   * @returns {Linguci} this instance for chaining
   */
  writeTranslations() {
    this.log("DEBUG", `Starting to write translation files`);

    let filesWritten = 0;

    // Write all updated PO files
    for (const sourcePath in this.translationPos) {
      this.log("DEBUG", `Writing translations for source: ${sourcePath}`);

      for (const translationPath in this.translationPos[sourcePath]) {
        const translationPo = this.translationPos[sourcePath][translationPath];

        try {
          // Compile PO object to buffer
          const outputBuf = gettextParser.po.compile(translationPo);

          // Write to file
          this.log("DEBUG", `Writing PO file: ${translationPath}`);
          fs.writeFileSync(translationPath, outputBuf);
          filesWritten++;
        } catch (error) {
          this.log(
            "ERROR",
            `Failed to write file ${translationPath}: ${error.message}`
          );
          throw error;
        }
      }
    }

    this.log("INFO", `Translation files written: ${filesWritten}`);
    return this;
  }

  /**
   * Commits the translation changes to git repository
   * @param {Object} options - Configuration options
   * @param {string} [options.commitMessageTemplate] - Optional template for commit message
   * @param {boolean} [options.addAll=false] - Whether to add all changes or only translation files
   * @returns {Promise<Linguci>} this instance for chaining
   */
  async commitChanges({ commitMessageTemplate, addAll = false } = {}) {
    this.log("DEBUG", "Starting to commit translation changes to git");

    try {
      // Determine which files to add
      const gitAddCommand = addAll
        ? "git add ."
        : 'git add $(find . -name "*.po")';

      // Execute git add command
      this.log("DEBUG", `Running: ${gitAddCommand}`);
      const addResult = await this._executeCommand(gitAddCommand);

      if (addResult.error) {
        throw new Error(`Git add failed: ${addResult.error}`);
      }

      // Get git status to see what's being committed
      const statusResult = await this._executeCommand("git status --porcelain");

      if (statusResult.error) {
        throw new Error(`Git status failed: ${statusResult.error}`);
      }

      // Count changed files by type
      const changedFiles = statusResult.stdout
        .split("\n")
        .filter((line) => line.trim());
      const addedFiles = changedFiles.filter((line) =>
        line.startsWith("A")
      ).length;
      const modifiedFiles = changedFiles.filter((line) =>
        line.startsWith("M")
      ).length;
      const totalChanges = changedFiles.length;

      if (totalChanges === 0) {
        this.log("INFO", "No changes to commit");
        return this;
      }

      // Generate commit message
      let commitMessage;

      if (commitMessageTemplate) {
        // Replace placeholders in template
        commitMessage = commitMessageTemplate
          .replace(/%totalChanges%/g, totalChanges)
          .replace(/%addedFiles%/g, addedFiles)
          .replace(/%modifiedFiles%/g, modifiedFiles)
          .replace(/%locales%/g, this.config.locales.join(", "));
      } else {
        // Default dynamic commit message
        const changedLocales = this._getChangedLocales(changedFiles);

        commitMessage =
          `feat(i18n): update translations for ${changedLocales.length} locales\n\n` +
          `Added ${addedFiles}, modified ${modifiedFiles} translation files\n` +
          `Locales: ${changedLocales.join(", ")}`;
      }

      // Execute git commit command
      const commitCommand = `git commit -m "${commitMessage.replace(
        /"/g,
        '\\"'
      )}"`;
      this.log("DEBUG", `Running: ${commitCommand}`);

      const commitResult = await this._executeCommand(commitCommand);

      if (commitResult.error) {
        throw new Error(`Git commit failed: ${commitResult.error}`);
      }

      this.log(
        "INFO",
        `Successfully committed ${totalChanges} changed files to git`
      );
      this.log("DEBUG", `Commit message: ${commitMessage}`);
    } catch (error) {
      this.log("ERROR", `Failed to commit changes: ${error.message}`);
      throw error;
    }

    return this;
  }

  /**
   * Extract changed locales from git status output
   * @private
   * @param {string[]} changedFiles - Array of changed file paths from git status
   * @returns {string[]} Array of changed locale codes
   */
  _getChangedLocales(changedFiles) {
    const locales = new Set();

    for (const file of changedFiles) {
      // Extract file path from git status line (remove status indicators)
      const filePath = file.substring(3);

      // Try to extract locale from path
      const locale = this._extractLocaleFromPath(filePath);
      if (locale) {
        locales.add(locale);
      }
    }

    return Array.from(locales);
  }

  /**
   * Execute a shell command and return the result
   * @private
   * @param {string} command - The command to execute
   * @returns {Promise<Object>} Object with stdout, stderr, and error properties
   */
  async _executeCommand(command) {
    return new Promise((resolve) => {
      const { exec } = require("child_process");

      exec(command, { cwd: this.workspace }, (error, stdout, stderr) => {
        resolve({
          stdout: stdout ? stdout.toString() : "",
          stderr: stderr ? stderr.toString() : "",
          error,
        });
      });
    });
  }

  /**
   * Extract locale code from translation file path
   * @private
   * @param {string} translationPath - Path to the translation file
   * @returns {string|null} The locale code or null if not found
   */
  _extractLocaleFromPath(translationPath) {
    // Try to match any of the configured locales in the path
    for (const locale of this.config.locales) {
      if (translationPath.includes(locale)) {
        return locale;
      }
    }
    return null;
  }

  /**
   * Update translation PO object with translation results
   * @private
   * @param {Object} translationPo - The translation PO object
   * @param {string} contextKey - The context key
   * @param {Object} object - The translation object
   */
  _updateTranslationPoWithResults(translationPo, contextKey, object) {
    if (!translationPo.translations[contextKey]) {
      return;
    }

    const context = translationPo.translations[contextKey];

    // Update each msgid with its translation
    for (const msgid in object) {
      if (context[msgid]) {
        // Ensure the translation is a non-empty string
        const translation = object[msgid] ? object[msgid].trim() : "";

        // Always initialize msgstr as an array with the translation
        context[msgid].msgstr = [translation];
      }
    }
  }

  /**
   * Get the full translation path with locale substitution if needed
   * @private
   * @param {string} translationPathTemplate - The translation path template
   * @param {string} locale - The locale code
   * @returns {string} The full translation path
   */
  _getTranslationPath(translationPathTemplate, locale) {
    return path.join(
      this.config.base_path,
      translationPathTemplate.includes("%locale%")
        ? translationPathTemplate.replace("%locale%", locale)
        : translationPathTemplate
    );
  }

  /**
   * Process a source file and return its PO object
   * @private
   * @param {string} sourcePath - Path to the source file
   * @returns {Object} The parsed PO object
   */
  _processSourceFile(sourcePath) {
    const sourceContent = fs.readFileSync(sourcePath, "utf8");
    return gettextParser.po.parse(sourceContent);
  }

  /**
   * Process a translation file, ensure all source entries exist in it
   * @private
   * @param {string} sourcePath - Path to the source file
   * @param {string} translationPath - Path to the translation file
   * @param {Object} sourcePo - The source PO object
   * @returns {Object} The processed translation PO object
   */
  _processTranslationFile(sourcePath, translationPath, sourcePo) {
    const translationContent = fs.readFileSync(translationPath, "utf8");
    const translationPo = gettextParser.po.parse(translationContent);

    // Initialize storage structures if not exists
    this._ensureStorageExists(sourcePath, translationPath);

    // Store translation PO object
    this.translationPos[sourcePath][translationPath] = translationPo;

    // Ensure all entries from source exist in translation
    this._syncEntriesFromSource(sourcePo, translationPo);

    return translationPo;
  }

  /**
   * Ensure storage structures exist for the given paths
   * @private
   * @param {string} sourcePath - Path to the source file
   * @param {string} translationPath - Path to the translation file
   */
  _ensureStorageExists(sourcePath, translationPath) {
    // For translation POs
    if (!this.translationPos[sourcePath]) {
      this.translationPos[sourcePath] = {};
    }

    // For translation batches
    if (!this.translationBatches[sourcePath]) {
      this.translationBatches[sourcePath] = {};
    }
    if (!this.translationBatches[sourcePath][translationPath]) {
      this.translationBatches[sourcePath][translationPath] = {};
    }
  }

  /**
   * Ensure all entries from source exist in translation
   * @private
   * @param {Object} sourcePo - The source PO object
   * @param {Object} translationPo - The translation PO object
   */
  _syncEntriesFromSource(sourcePo, translationPo) {
    for (const contextKey in sourcePo.translations) {
      const sourceContext = sourcePo.translations[contextKey];

      // Create context in translation if it doesn't exist
      if (!translationPo.translations[contextKey]) {
        translationPo.translations[contextKey] = {};
      }

      const translationContext = translationPo.translations[contextKey];

      // Check each message in this context
      for (const msgid in sourceContext) {
        if (!translationContext[msgid]) {
          // Copy the missing entry to translation
          translationContext[msgid] = { ...sourceContext[msgid] };

          // Clear the translation if it's not the empty msgid
          if (msgid !== "") {
            translationContext[msgid].msgstr = [""];
          }
        } else if (
          msgid !== "" &&
          translationContext[msgid].msgstr.length === 0
        ) {
          // Fix any entries that have an empty array instead of an array with empty string
          translationContext[msgid].msgstr = [""];
        }
      }
    }
  }

  /**
   * Find entries that need translation (empty msgstr)
   * @private
   * @param {Object} translationPo - The translation PO object
   * @returns {Object} Object with entries needing translation, grouped by context
   */
  _findEntriesNeedingTranslation(translationPo) {
    const emptyMsgStrs = {};

    for (const contextKey in translationPo.translations) {
      const translationContext = translationPo.translations[contextKey];

      for (const msgid in translationContext) {
        // Skip the header
        if (msgid === "") continue;

        // Check if translation is missing or empty
        const msgstr = translationContext[msgid].msgstr;
        if (msgstr.length === 0 || (msgstr.length === 1 && msgstr[0] === "")) {
          emptyMsgStrs[contextKey] = emptyMsgStrs[contextKey] || {};
          emptyMsgStrs[contextKey][msgid] = translationContext[msgid];
        }
      }
    }

    return emptyMsgStrs;
  }

  /**
   * Create Zod schema batches for entries that need translation
   * @private
   * @param {Object} emptyMsgStrs - Object with entries needing translation
   * @param {number} batchSize - Number of entries per batch
   * @returns {Object} Object with schema batches grouped by context
   */
  _createSchemaBatches(emptyMsgStrs, batchSize) {
    const schemaBatches = {};

    for (const contextKey in emptyMsgStrs) {
      const msgids = Object.keys(emptyMsgStrs[contextKey]);
      schemaBatches[contextKey] = {};

      // Create batches for this context
      for (
        let i = 0, batchNumber = 0;
        i < msgids.length;
        i += batchSize, batchNumber++
      ) {
        const batchMsgids = msgids.slice(i, i + batchSize);
        const batchSchemaObj = {};

        // Add schemas for each msgid in this batch
        for (const msgid of batchMsgids) {
          batchSchemaObj[msgid] = z.string();
        }

        // Store the Zod schema object
        schemaBatches[contextKey][batchNumber] = z.object(batchSchemaObj);
      }
    }

    return schemaBatches;
  }
}

export default Linguci;
