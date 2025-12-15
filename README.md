# AnkiApps

A small collection of Anki-based apps using AI and AnkiConnect. Entirely client-side, bring your own key.

## Setup

AnkiConnect needs to allow requests from your application origin. Edit your AnkiConnect config:

**Tools → Add-ons → AnkiConnect → Config**

Add this site name to `webCorsOriginList`:

```json
{
  "webCorsOriginList": ["https://ankiapps.vercel.app"]
}
```

Restart Anki after making changes.
