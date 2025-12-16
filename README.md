# AnkiApps

A small collection of Anki-based apps using AI and AnkiConnect. Entirely client-side, bring your own key.

## Apps

- **Quiz** – Practice with context-aware questions
- **Generate** – Create new cards with AI
- **Review** – Browse and manage existing cards

## Setup

1. Get an Anthropic API key so AnkiApps can use Claude. Haiku is cheaper, Sonnet is smarter.

    You'll pay Anthropic directly for your use. In my case, even intensive studying costs under $5/mo.

2.  AnkiConnect needs to allow requests from your application origin.

    Edit your AnkiConnect config and restart Anki afterwards:

      **Tools → Add-ons → AnkiConnect → Config**

      Add this site name to `webCorsOriginList`:

    ```json
    {
      "webCorsOriginList": ["https://ankiapps.vercel.app"]
    }
    ```

## Development

```bash
npm install
npm run dev
```

Vibe coded with React, TypeScript, and Vite. I barely read the code.
