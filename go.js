const gettextParser = require("gettext-parser");
const fs = require("fs");
const { z } = require("zod");

const sourceInput = gettextParser.po.parse(
  fs.readFileSync("locales/en-US.po", "utf8")
);
const translationInput = gettextParser.po.parse(
  fs.readFileSync("locales/fa-IR.po", "utf8")
);

// Parse both PO files
const sourcePo = sourceInput;
const translationPo = translationInput;

// Go deep until found the msgid in the source and make sure that exact object that has the same msgid in the translation if not add it to the translation
const sourceTranslations = sourcePo.translations;
let modified = false;

// Iterate through each context in source
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

      modified = true;
      console.log(`Added missing msgid: "${msgid}"`);
    }
  }
}

const emptyMsgStrs = {};
for (const contextKey in translationPo.translations) {
  const translationContext = translationPo.translations[contextKey];

  for (const msgid in translationContext) {
    if (
      translationContext[msgid].msgstr.length === 0 ||
      translationContext[msgid].msgstr[0] === ""
    ) {
      emptyMsgStrs[contextKey] = emptyMsgStrs[contextKey] || {};
      emptyMsgStrs[contextKey][msgid] = translationContext[msgid];
    }
  }
}

// Create schema batches in the format { contextKey: { batchNumber: { msgid: schema } } }
const schemaBatches = {};
const batchSize = 5;

// First, organize all the msgids by context
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

    // Initialize this batch for this context
    schemaBatches[contextKey][batchNumber] = {};

    // Add schemas for each msgid in this batch
    for (const msgid of batchMsgids) {
      schemaBatches[contextKey][batchNumber][msgid] = z
        .string()
        .describe("Word by word translation of the key");
    }
  }
}
