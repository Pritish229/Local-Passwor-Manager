# VaultKey Secure Password Sharing Service (Cloudflare Worker)

Zero-knowledge, ephemeral credential-sharing backend built for Cloudflare Workers & Cloudflare KV.

---

## 1. Architectural Highlights

- **Zero-Knowledge Delivery**: Plaintext credentials and decryption keys **never** reach the Cloudflare Worker or KV store.
- **Client-Side Authenticated Encryption**: Credentials are encrypted locally using **AES-256-GCM** with a unique 12-byte initialization vector (IV) and a random 256-bit key.
- **Fragment-Based Decryption Key**: The decryption key is embedded in the URL fragment (`#key=...`). Browsers never transmit URL fragments in HTTP requests.
- **Capability-Based Revocation**: Each share receives an unpredictable 32-byte `revocationToken` known only to the creator. The server stores only its `SHA-256` hash and verifies deletions in constant time.
- **Strict Server-Enforced Expiration**: Employs both Cloudflare KV `expirationTtl` automatic eviction and runtime sub-second timestamp validation (`Date.now() / 1000 >= expiresAt`).
- **Abuse & Flooding Protection**: IP-based rate limiting on creation (`POST /shares`, max 20/min) and retrieval (`GET /shares/:id`, max 60/min).

---

## 2. API Endpoints

| Method | Path | Description | Headers |
|---|---|---|---|
| `POST` | `/shares` | Stores an encrypted payload | `Content-Type: application/json` |
| `GET` | `/shares/:shareId` | Retrieves encrypted ciphertext & IV | `Accept: application/json` |
| `DELETE` | `/shares/:shareId` | Revokes and destroys a share | `X-Revocation-Token: <token>` |
| `GET` | `/health` | Health check & service status | None |

### `POST /shares` Request Body:
```json
{
  "ciphertext": "base64EncodedCiphertextWithAuthTag",
  "iv": "base64Encoded12ByteIV",
  "expires_in": 600
}
```

### `POST /shares` Response (HTTP 201):
```json
{
  "success": true,
  "shareId": "A1b2C3d4E5f6G7h8I9j0",
  "expiresAt": 1740000600,
  "expiresIn": 600,
  "revocationToken": "secretRevocationCapabilityToken"
}
```

### `GET /shares/:shareId` Response (HTTP 200):
```json
{
  "ciphertext": "base64EncodedCiphertextWithAuthTag",
  "iv": "base64Encoded12ByteIV",
  "expiresAt": 1740000600,
  "remainingSeconds": 589
}
```

### `DELETE /shares/:shareId` Response (HTTP 200):
```json
{
  "success": true,
  "message": "Share has been permanently revoked and deleted."
}
```

---

## 3. Deployment Instructions

### Prerequisites
1. Free [Cloudflare Account](https://dash.cloudflare.com/sign-up).
2. Node.js (v18+ recommended) and npm installed.

### Step 1: Install Dependencies
From within this `sharing-service/` directory:
```bash
npm install
```

### Step 2: Authenticate Wrangler
Log in to your Cloudflare account using the Wrangler CLI:
```bash
npx wrangler login
```

### Step 3: Create Cloudflare KV Namespace
Create the production KV namespace:
```bash
npx wrangler kv:namespace create SHARES_KV
```
You will receive output similar to:
```toml
[[kv_namespaces]]
binding = "SHARES_KV"
id = "a1b2c3d4e5f67890abcdef1234567890"
```

Create the preview namespace for local simulation:
```bash
npx wrangler kv:namespace create SHARES_KV --preview
```

### Step 4: Configure `wrangler.toml`
Open `wrangler.toml` and paste the generated IDs:
```toml
name = "vaultkey-share-api"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "SHARES_KV"
id = "<YOUR_PRODUCTION_KV_ID>"
preview_id = "<YOUR_PREVIEW_KV_ID>"

[vars]
ENVIRONMENT = "production"
MAX_PAYLOAD_SIZE = "65536"
```

### Step 5: Deploy
Deploy the worker live to the Cloudflare edge:
```bash
npx wrangler deploy
```
Wrangler will output your live URL:
`https://vaultkey-share-api.<your-subdomain>.workers.dev`

---

## 4. Local Development

Run the Worker locally with a simulated KV environment:
```bash
npm run dev
```
By default, the local dev server listens on `http://127.0.0.1:8787`.

Test health check:
```bash
curl http://127.0.0.1:8787/health
```

---

## 5. Free-Tier Limits & Capacity

| Resource | Cloudflare Free Tier Limit | VaultKey Impact |
|---|---|---|
| **Workers Requests** | 100,000 requests / day | ~50,000 password shares & views per day |
| **KV Read Operations** | 100,000 reads / day | 100,000 retrievals per day |
| **KV Write Operations** | 1,000 writes / day | 1,000 active share creations per day |
| **KV Delete Operations**| 1,000 deletes / day | 1,000 manual revocations per day |
| **KV Storage** | 1 GB total | Stores ~15,000 concurrent shares (<64 KB each) |
| **Max Payload Size** | Configured to 64 KB | Standard encrypted password record is ~1-2 KB |
| **Max Lifespan** | Up to 7 days (604,800s) | Configurable (10m, 1h, 24h, custom) |
