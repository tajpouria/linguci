import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import gettextParser from "gettext-parser";
import { z } from "zod";

/**
 * Main class for handling linguci configuration
 */
class Linguci {
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
   * The workspace directory path
   * @type {string}
   */
  workspace = null;

  /**
   * The parsed configuration object from linguci.yml/yaml
   * @type {Object}
   * @property {Array<{source: string, translation: string}>} files - List of files to be translated, each with source and translation paths
   * @property {string[]} locales - List of target locale codes that must be valid language keys
   * @property {string} base_path - Base path for file resolution
   */
  config = null;

  /**
   * Storage for translation batches organized by file, locale, and context
   * @type {Object}
   */
  translationBatches = null;

  /**
   * Storage for translation PO objects organized by file and locale
   * @type {Object}
   */
  translationPos = null;

  /**
   * @param {string} workspace - The workspace directory path
   */
  constructor(workspace) {
    this.workspace = workspace;
    this.config = null;
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

    return this;
  }

  createTranslationBatches({ batchSize = 5 }) {
    const config = this.config;
    this.translationBatches = {};
    this.translationPos = {};

    for (const file of config.files) {
      const sourcePath = path.join(config.base_path, file.source);
      const sourceContent = fs.readFileSync(sourcePath, "utf8");
      const sourcePo = gettextParser.po.parse(sourceContent);

      // Extract source locale from source file path if possible
      const sourceLocale = config.locales.find((locale) =>
        file.source.includes(locale)
      );

      for (const locale of config.locales) {
        // Skip if this locale is the source locale
        if (locale === sourceLocale) {
          continue;
        }

        // Handle %locale% placeholder in translation path
        const translationPath = path.join(
          config.base_path,
          file.translation.includes("%locale%")
            ? file.translation.replace("%locale%", locale)
            : file.translation
        );

        // Skip if translation file doesn't exist
        if (!fs.existsSync(translationPath)) {
          console.warn(`Translation file not found: ${translationPath}`);
          continue;
        }

        const translationContent = fs.readFileSync(translationPath, "utf8");
        const translationPo = gettextParser.po.parse(translationContent);

        // Store translation PO object using full paths
        if (!this.translationPos[sourcePath]) {
          this.translationPos[sourcePath] = {};
        }
        if (!this.translationPos[sourcePath][translationPath]) {
          this.translationPos[sourcePath][translationPath] = {};
        }
        this.translationPos[sourcePath][translationPath] = translationPo;

        // Ensure the file and locale are initialized in batches using full paths
        if (!this.translationBatches[sourcePath]) {
          this.translationBatches[sourcePath] = {};
        }
        if (!this.translationBatches[sourcePath][translationPath]) {
          this.translationBatches[sourcePath][translationPath] = {};
        }

        const sourceTranslations = sourcePo.translations;

        // First, ensure all entries from source exist in translation
        for (const contextKey in sourceTranslations) {
          const sourceContext = sourceTranslations[contextKey];

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
            }
          }
        }

        // Find entries that need translation (empty msgstr)
        const emptyMsgStrs = {};
        for (const contextKey in translationPo.translations) {
          const translationContext = translationPo.translations[contextKey];

          for (const msgid in translationContext) {
            if (
              msgid !== "" && // Skip the header
              (translationContext[msgid].msgstr.length === 0 ||
                translationContext[msgid].msgstr[0] === "")
            ) {
              emptyMsgStrs[contextKey] = emptyMsgStrs[contextKey] || {};
              emptyMsgStrs[contextKey][msgid] = translationContext[msgid];
            }
          }
        }

        // Create schema batches for this file and locale
        const schemaBatches = {};

        // Organize all the msgids by context
        for (const contextKey in emptyMsgStrs) {
          const msgids = Object.keys(emptyMsgStrs[contextKey]);

          // Initialize this context in the schema batches
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

        // Store batches for this file and translation path
        this.translationBatches[sourcePath][translationPath] = schemaBatches;
      }
    }

    return this;
  }
}

export default Linguci;
