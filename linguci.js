const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const gettextParser = require("gettext-parser");

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

      const sourcePath = path.join(
        config.base_path || this.workspace,
        file.source
      );
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source file does not exist: ${file.source}`);
      }
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

    return this;
  }
}

module.exports = Linguci;
