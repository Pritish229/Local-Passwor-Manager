# VaultKey Secure Share Web Viewer

A minimal, zero-external-dependency static web page for decrypting and viewing shared credentials on any device.

---

## 1. Key Characteristics

- **Zero External Dependencies**: Contains no Google Fonts, CDN stylesheets, third-party analytics, or remote scripts that could leak client IP, referrers, or metadata.
- **Client-Side AES-256-GCM Decryption**: Runs in the browser via the standard **Web Crypto API** (`crypto.subtle`).
- **Fragment-Isolated Key**: Reads the decryption key exclusively from `window.location.hash`. The key is **never** sent in HTTP requests to the hosting server.
- **Memory Protection**: Automatically wipes decrypted secrets from the DOM and memory on `visibilitychange` (tab switch/blur) and `pagehide`/`beforeunload`.
- **Responsive Aesthetic**: Matches VaultKey's dark/light modern UI with masked password toggles, one-click copy buttons, and an active expiration countdown timer.
- **No Account Required**: Recipients can view the shared credential on any mobile or desktop device without installing VaultKey.

---

## 2. Deployment Options

### Option A: Deploy to Cloudflare Pages (Recommended - Free)

1. In the Cloudflare Dashboard, navigate to **Compute (Workers) > Pages**.
2. Click **Create Application > Upload Assets**.
3. Name your project (e.g. `vaultkey-share`).
4. Drag and drop the `share-viewer/` folder (or upload `index.html`).
5. Click **Deploy Site**.
6. Cloudflare will provide a permanent free domain, e.g.:
   `https://vaultkey-share.pages.dev`

### Option B: Deploy to GitHub Pages (Free)

1. Create a public or private repository on GitHub (e.g. `vaultkey-share-viewer`).
2. Commit `index.html` to the repository.
3. In **Settings > Pages**, choose `Deploy from a branch` (select `main` or `/root`).
4. Your viewer will be live at:
   `https://<username>.github.io/vaultkey-share-viewer/`

### Option C: Serve via Cloudflare Worker Static Assets

Cloudflare Workers can also host static assets directly alongside the API.
In `sharing-service/wrangler.toml`:
```toml
[assets]
directory = "../share-viewer"
binding = "ASSETS"
```

---

## 3. Configuring VaultKey Desktop App

Once you have your Cloudflare Worker URL and Web Viewer URL:

1. Open **VaultKey** desktop application.
2. Click **Settings** (or press `Ctrl+,`).
3. Select the **Cloud Sharing** tab.
4. Set:
   - **Sharing API Endpoint**: e.g., `https://vaultkey-share-api.your-subdomain.workers.dev`
   - **Web Viewer URL**: e.g., `https://vaultkey-share.pages.dev`
5. Click **Test Connection** to verify API reachability.
6. Click **Save Sharing Configuration**.
