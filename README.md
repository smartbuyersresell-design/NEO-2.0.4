# NEO 2.4

A lightweight, Google-Assistant-style voice/text assistant that runs entirely in the browser and is powered by **your own Gemini API key**. No backend server, no build step, no native app store — it installs straight to a phone's home screen as a Progressive Web App (PWA), which is why it stays light enough for low-spec Android phones.

## What's in this folder

```
neo24/
├── index.html      the whole app UI (login screen + assistant screen + settings)
├── style.css        dark, orb-style theme
├── script.js        login, chat logic, Gemini API calls, voice input/output
├── manifest.json    lets Chrome/Android install it as an app named "NEO 2.4"
├── sw.js            service worker — caches the app shell so it opens instantly
└── icons/           the app icon (192px, 512px, apple touch icon, favicon)
```

## How to run it

**Option A — quickest, on a computer:**
Just double-click `index.html` and it opens in your browser. Voice input needs Chrome (it uses the Web Speech API).

**Option B — install it as an app on an Android phone (recommended):**
1. Put the whole `neo24` folder on a small web host. Any static host works — GitHub Pages, Netlify, Vercel, Cloudflare Pages, or even `python3 -m http.server` on a computer on the same Wi-Fi as the phone.
2. Open the site's URL in **Chrome on the phone**.
3. Tap the ⋮ menu → **"Add to Home screen" / "Install app"**.
4. NEO 2.4 now sits on the home screen with its own icon and opens full-screen like a native app — no browser bar, no app-store install, and only a few hundred KB to download.

This PWA approach is what keeps it usable on low-spec phones: there's no framework to load, no heavy engine, just plain HTML/CSS/JS, and the service worker caches everything after the first visit so it opens instantly offline (only the actual Gemini requests need internet).

**Option C — a real installable .apk file:**
If you specifically need a `.apk`, you can wrap this same folder with a free tool like [PWABuilder](https://www.pwabuilder.com) (upload the hosted URL, it packages the PWA into an Android app) or [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap). Building and signing an .apk requires the Android SDK, which isn't available in this environment, so that packaging step needs to happen on your own machine or with PWABuilder's hosted service.

## Getting a Gemini API key

Go to **https://aistudio.google.com/apikey**, sign in with a Google account, and click "Create API key". It's free to start (with rate limits).

## How login works

- The first time NEO 2.4 opens, it asks for a Gemini API key.
- On "Continue," it sends one tiny test request to Gemini to make sure the key works, then stores the key **only on the device** (`localStorage` — never sent anywhere except directly to Google's API).
- After that, it goes straight to the assistant screen on every open, until you remove the key from Settings (⚙ → "Remove API key & sign out").

## Changing the Gemini model

Open Settings (⚙ icon) to switch between `gemini-2.5-flash` (default, fastest/cheapest — best for low-spec phones), `gemini-2.0-flash`, or `gemini-2.5-pro`. If Google renames or retires a model in the future, just pick another one from that list — no code changes needed.

## Notes on the design

- The orb with four colored dots is an original design in the spirit of voice-assistant UIs (breathing pulse while listening, orbiting dots while thinking) — it is not a copy of any company's logo.
- Dark background, minimal chrome, big mic target, and system fonts (no font downloads) were chosen specifically to keep memory/CPU/network use low on older phones.
- Voice input uses the phone's built-in speech recognition (Chrome/Android WebView); voice output uses the built-in speech synthesiser. Both toggle off gracefully on browsers that don't support them — you can still type.
