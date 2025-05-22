# LinguCI Github Action

Automatically translates missing locale strings and opens pull requests with updated translations in your GitHub CI pipeline.

## Features

- Seamlessly integrates with GitHub Actions workflow
- Uses Google's Generative AI for high-quality translations (it's easy to add other providers, open a PR!)
- Automatically creates PRs with translation updates
- Configurable batch processing and concurrency
- Supports multiple locales and file formats

## File Format Requirements

Currently, LinguCI only supports PO (Portable Object) files as defined in the [GNU gettext specification](https://www.gnu.org/software/gettext/manual/html_node/PO-Files.html). To generate PO files from your source code, you can use various internationalization libraries such as [LinguiJS](https://lingui.dev/) - A complete internationalization framework for JavaScript/TypeScript projects. We recommend using these tools to instrument your code and generate PO files that LinguCI can then translate.

## Setup

### 1. Create configuration file

Create a `linguci.yml` file in your repository root:

```yaml
base_path: .
locales:
  - en-US
  - fr-FR
  - es-ES
files:
  - source: locales/en-US.po
    translation: locales/%locale%.po
llm:
  provider: google-generative-ai
  model: gemini-2.0-flash
```

| Option                | Description                                   | Required             | Example                                                                                                                                                                 |
| --------------------- | --------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base_path`           | Base directory for resolving file paths       | No (defaults to `.`) | `./src`                                                                                                                                                                 |
| `locales`             | Array of locale codes to translate into       | Yes                  | `['en-US', 'fr-FR', 'es-ES']` Checkout [support codes](https://github.com/tajpouria/linguci/blob/0256ec179d763e418b2f678f2ece1f83b70bb453/linguci.js#L93-L150) for more |
| `files`               | Array of file mappings for translation        | Yes                  | See below                                                                                                                                                               |
| `files[].source`      | Path to source file with strings to translate | Yes                  | `locales/en-US.po`                                                                                                                                                      |
| `files[].translation` | Path pattern for translation files            | Yes                  | `locales/%locale%.po`                                                                                                                                                   |
| `llm.provider`        | LLM provider for translations                 | Yes                  | `google-generative-ai`                                                                                                                                                  |
| `llm.model`           | Specific model to use for translations        | Yes                  | `gemini-2.0-flash`                                                                                                                                                      |

### 2. Add GitHub workflow

Create a workflow file (e.g., `.github/workflows/linguci.yml`):

```yaml
on:
  workflow_dispatch:

permissions:
  contents: write # Required for writing to the repository
  pull-requests: write # Required for creating pull requests

jobs:
  linguci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Linguci
        uses: tajpouria/linguci@v0.1.0
        with:
          batch_size: 20
          language_concurrency: 2
          max_retries: 3
          retry_delay: 1000
          branch_prefix: linguci
          pr_title: "Update translations"
          pr_body: "This PR includes translation updates\n\n*Generated automatically by linguci*"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GOOGLE_GENERATIVE_AI_API_KEY: ${{ secrets.GOOGLE_GENERATIVE_AI_API_KEY }}
```

| Option                 | Description                                              | Default               |
| ---------------------- | -------------------------------------------------------- | --------------------- |
| `batch_size`           | Number of strings to translate in each batch             | `20`                  |
| `language_concurrency` | Number of languages to translate concurrently            | `2`                   |
| `max_retries`          | Maximum number of retry attempts for failed translations | `3`                   |
| `retry_delay`          | Delay between retries in milliseconds                    | `1000`                |
| `branch_prefix`        | Prefix for the new branch name                           | `linguci`             |
| `pr_title`             | Title for the pull request                               | `Update translations` |
| `pr_body`              | Body content for the pull request                        | Custom message        |

### 3. Set up required secrets

Add the following secrets to your repository:

- `GITHUB_TOKEN`: GitHub token with write access to the repository
- `GOOGLE_GENERATIVE_AI_API_KEY`: Your Google Generative AI API key

## License

MIT
