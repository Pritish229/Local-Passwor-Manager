/**
 * VaultKey Secure Password Sharing Service — Cloudflare Worker
 * 
 * Architecture:
 * - Zero-knowledge payload store: plaintexts and decryption keys NEVER reach the server.
 * - Stores only AES-256-GCM encrypted payloads with nonce/IV and expiration.
 * - Revocation is protected by per-share capability tokens (SHA-256 hashed at rest).
 * - Rate limited by IP to prevent brute-force enumeration and abuse.
 */

// In-memory rate limiting bucket for Cloudflare Worker instances
const ipRateLimit = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_POST_PER_MIN = 20;            // Max 20 shares created per minute per IP
const MAX_GET_PER_MIN = 60;             // Max 60 retrievals per minute per IP
const MAX_PAYLOAD_SIZE = 65536;         // 64 KB maximum payload size
const MIN_EXPIRATION_SEC = 60;          // Minimum 1 minute
const MAX_EXPIRATION_SEC = 7 * 24 * 3600; // Maximum 7 days
const DEFAULT_EXPIRATION_SEC = 600;     // Default 10 minutes

/**
 * Standard Security & CORS Headers
 */
function getSecurityHeaders(corsOrigin = "*") {
    return {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Revocation-Token",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache"
    };
}

/**
 * JSON Response helper
 */
function jsonResponse(data, status = 200, corsOrigin = "*") {
    return new Response(JSON.stringify(data), {
        status,
        headers: getSecurityHeaders(corsOrigin)
    });
}

/**
 * Simple IP-based Rate Limiter
 */
function checkRateLimit(ip, type = "get") {
    const now = Date.now();
    const key = `${ip}:${type}`;
    const limit = type === "post" ? MAX_POST_PER_MIN : MAX_GET_PER_MIN;

    let record = ipRateLimit.get(key);
    if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
        record = { count: 1, startTime: now };
        ipRateLimit.set(key, record);
        // Periodic cleanup of stale entries
        if (ipRateLimit.size > 5000) {
            for (const [k, v] of ipRateLimit.entries()) {
                if (now - v.startTime > RATE_LIMIT_WINDOW_MS) {
                    ipRateLimit.delete(k);
                }
            }
        }
        return true;
    }

    if (record.count >= limit) {
        return false;
    }

    record.count++;
    return true;
}

/**
 * Constant-time comparison between two hex strings to prevent timing attacks
 */
function timingSafeEqualHex(a, b) {
    if (typeof a !== "string" || typeof b !== "string") return false;
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

/**
 * Computes SHA-256 hash formatted as lowercase hex
 */
async function sha256Hex(text) {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates a cryptographically secure random token (base64url)
 */
function generateSecureToken(byteLength = 16) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    let str = "";
    for (let i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
    }
    return btoa(str)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

/**
 * Validate Share ID format (alphanumeric and dashes/underscores, 16-64 chars)
 */
function isValidShareId(id) {
    return typeof id === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(id);
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const method = request.method.toUpperCase();
        const corsOrigin = request.headers.get("Origin") || "*";

        // Handle CORS Preflight
        if (method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: getSecurityHeaders(corsOrigin)
            });
        }

        const clientIp = request.headers.get("CF-Connecting-IP") || 
                         request.headers.get("X-Forwarded-For") || 
                         "127.0.0.1";

        // Route: Health check
        if ((url.pathname === "/health" || url.pathname === "/api/health") && method === "GET") {
            return jsonResponse({
                status: "healthy",
                service: "VaultKey Secure Sharing API",
                time: new Date().toISOString()
            }, 200, corsOrigin);
        }

        // KV Namespace check (with graceful fallback for local development/mocking)
        const kv = env && env.SHARES_KV ? env.SHARES_KV : (globalThis._MOCK_KV || null);

        // Normalize path: handle both /shares and /api/shares
        let pathname = url.pathname;
        if (pathname.startsWith("/api/")) {
            pathname = pathname.substring(4);
        }

        // ==================== POST /shares (Create Share) ====================
        if (pathname === "/shares" && method === "POST") {
            if (!checkRateLimit(clientIp, "post")) {
                return jsonResponse({ error: "Too many share requests. Please wait a moment." }, 429, corsOrigin);
            }

            // Check content length header
            const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
            if (contentLength > MAX_PAYLOAD_SIZE) {
                return jsonResponse({ error: "Payload exceeds maximum allowed size (64 KB)." }, 413, corsOrigin);
            }

            let body;
            try {
                const text = await request.text();
                if (text.length > MAX_PAYLOAD_SIZE) {
                    return jsonResponse({ error: "Payload exceeds maximum allowed size." }, 413, corsOrigin);
                }
                body = JSON.parse(text);
            } catch (err) {
                return jsonResponse({ error: "Invalid JSON request body." }, 400, corsOrigin);
            }

            const { ciphertext, iv, expires_in, salt, pin_hash, title, uname } = body;

            // Strict Validation of Encrypted Payload Structure
            if (!ciphertext || typeof ciphertext !== "string" || ciphertext.length < 16 || ciphertext.length > 48000) {
                return jsonResponse({ error: "Invalid ciphertext. Must be a valid encrypted string." }, 400, corsOrigin);
            }

            if (!iv || typeof iv !== "string" || iv.length < 12 || iv.length > 64) {
                return jsonResponse({ error: "Invalid initialization vector (IV)." }, 400, corsOrigin);
            }

            // Expiration Validation
            let expiresIn = DEFAULT_EXPIRATION_SEC;
            if (expires_in !== undefined && expires_in !== null) {
                const parsedExp = parseInt(expires_in, 10);
                if (isNaN(parsedExp) || parsedExp < MIN_EXPIRATION_SEC || parsedExp > MAX_EXPIRATION_SEC) {
                    return jsonResponse({ 
                        error: `Expiration must be between ${MIN_EXPIRATION_SEC} and ${MAX_EXPIRATION_SEC} seconds.` 
                    }, 400, corsOrigin);
                }
                expiresIn = parsedExp;
            }

            // Cryptographically secure identifiers
            const shareId = generateSecureToken(18);        // 24 url-safe chars
            const revocationToken = generateSecureToken(32); // 43 url-safe chars
            const revocationHash = await sha256Hex(revocationToken);

            const nowSec = Math.floor(Date.now() / 1000);
            const expiresAt = nowSec + expiresIn;

            const record = {
                ciphertext,
                iv,
                salt: salt || "",
                pin_hash: pin_hash || "",
                title: title ? String(title).substring(0, 100) : "",
                uname: uname ? String(uname).substring(0, 100) : "",
                failed_attempts: 0,
                createdAt: nowSec,
                expiresAt,
                revocationHash
            };

            if (!kv) {
                return jsonResponse({ error: "Storage backend (SHARES_KV) is not configured." }, 503, corsOrigin);
            }

            try {
                // Cloudflare KV automatic expiration via expirationTtl
                await kv.put(`share:${shareId}`, JSON.stringify(record), {
                    expirationTtl: Math.max(60, expiresIn)
                });
            } catch (err) {
                return jsonResponse({ error: "Failed to store encrypted share." }, 500, corsOrigin);
            }

            return jsonResponse({
                success: true,
                shareId,
                expiresAt,
                expiresIn,
                revocationToken // Given ONLY once to creator for manual revocation
            }, 201, corsOrigin);
        }

        // ==================== POST /shares/:shareId/unlock (Unlock with 4-Digit Code) ====================
        if (pathname.startsWith("/shares/") && pathname.endsWith("/unlock") && method === "POST") {
            const shareId = pathname.substring("/shares/".length, pathname.length - "/unlock".length).trim();

            if (!isValidShareId(shareId)) {
                return jsonResponse({ error: "Malformed share identifier." }, 400, corsOrigin);
            }

            if (!checkRateLimit(clientIp, "post")) {
                return jsonResponse({ error: "Too many attempts. Please slow down." }, 429, corsOrigin);
            }

            if (!kv) {
                return jsonResponse({ error: "Storage backend is not configured." }, 503, corsOrigin);
            }

            let raw;
            try {
                raw = await kv.get(`share:${shareId}`);
            } catch (err) {
                return jsonResponse({ error: "Storage error." }, 500, corsOrigin);
            }

            if (!raw) {
                return jsonResponse({ error: "This share link does not exist, has expired, or has already been burned." }, 404, corsOrigin);
            }

            let record;
            try {
                record = JSON.parse(raw);
            } catch (err) {
                return jsonResponse({ error: "Corrupted share record." }, 500, corsOrigin);
            }

            const nowSec = Math.floor(Date.now() / 1000);
            if (record.revoked || nowSec >= record.expiresAt) {
                try { ctx.waitUntil(kv.delete(`share:${shareId}`)); } catch (e) { /* ignore */ }
                return jsonResponse({ error: "This share link has expired or was revoked." }, 410, corsOrigin);
            }

            let body = {};
            try {
                body = JSON.parse(await request.text());
            } catch (e) {
                return jsonResponse({ error: "Invalid JSON body." }, 400, corsOrigin);
            }

            const enteredPin = String(body.pin || body.code || "").trim();
            if (!enteredPin || enteredPin.length !== 4) {
                return jsonResponse({ error: "Please enter a valid 4-digit security code." }, 400, corsOrigin);
            }

            // Verify PIN against stored pin_hash
            const computedHash = await sha256Hex(enteredPin + (record.salt || ""));
            const isMatch = timingSafeEqualHex(computedHash, record.pin_hash);

            if (!isMatch) {
                record.failed_attempts = (record.failed_attempts || 0) + 1;
                const remaining = 5 - record.failed_attempts;
                if (remaining <= 0) {
                    try { await kv.delete(`share:${shareId}`); } catch (e) { /* ignore */ }
                    return jsonResponse({ error: "Too many incorrect attempts (5/5). Link has been burned and destroyed." }, 403, corsOrigin);
                }

                // Update attempts in KV
                try {
                    const ttl = Math.max(60, record.expiresAt - nowSec);
                    await kv.put(`share:${shareId}`, JSON.stringify(record), { expirationTtl: ttl });
                } catch (e) {}

                return jsonResponse({ 
                    error: `Incorrect 4-digit code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` 
                }, 400, corsOrigin);
            }

            // Successful Unlock: Burn share from KV immediately (one-time view)
            try {
                await kv.delete(`share:${shareId}`);
            } catch (e) { /* ignore */ }

            return jsonResponse({
                success: true,
                ciphertext: record.ciphertext,
                iv: record.iv,
                salt: record.salt || "",
                title: record.title || "Protected Credential",
                uname: record.uname || ""
            }, 200, corsOrigin);
        }

        // ==================== GET /shares/:shareId (Retrieve Share Info) ====================
        if (pathname.startsWith("/shares/") && method === "GET") {
            const shareId = pathname.substring("/shares/".length).trim();

            if (!isValidShareId(shareId)) {
                return jsonResponse({ error: "Malformed share identifier." }, 400, corsOrigin);
            }

            if (!checkRateLimit(clientIp, "get")) {
                return jsonResponse({ error: "Too many requests. Please slow down." }, 429, corsOrigin);
            }

            if (!kv) {
                return jsonResponse({ error: "Storage backend is not configured." }, 503, corsOrigin);
            }

            let raw;
            try {
                raw = await kv.get(`share:${shareId}`);
            } catch (err) {
                return jsonResponse({ error: "Failed to read from storage." }, 500, corsOrigin);
            }

            if (!raw) {
                // Return generic 404 for missing or already purged shares
                return jsonResponse({ error: "This share link does not exist, has expired, or has already been burned." }, 404, corsOrigin);
            }

            let record;
            try {
                record = JSON.parse(raw);
            } catch (err) {
                return jsonResponse({ error: "Corrupted share record." }, 500, corsOrigin);
            }

            const nowSec = Math.floor(Date.now() / 1000);
            if (record.revoked) {
                return jsonResponse({ error: "This share has been revoked by the sender." }, 410, corsOrigin);
            }

            if (nowSec >= record.expiresAt) {
                // Background cleanup if KV TTL hasn't purged yet
                try { ctx.waitUntil(kv.delete(`share:${shareId}`)); } catch (e) { /* ignore */ }
                return jsonResponse({ error: "This share link has expired." }, 410, corsOrigin);
            }

            // If PIN protection is enabled, return metadata only (do NOT return ciphertext before PIN verification)
            if (record.pin_hash) {
                return jsonResponse({
                    valid: true,
                    requiresPin: true,
                    title: record.title || "Protected Credential",
                    uname: record.uname || "",
                    salt: record.salt || "",
                    expiresAt: record.expiresAt,
                    remainingSeconds: Math.max(0, record.expiresAt - nowSec)
                }, 200, corsOrigin);
            }

            // Fallback for legacy shares without PIN
            return jsonResponse({
                ciphertext: record.ciphertext,
                iv: record.iv,
                expiresAt: record.expiresAt,
                remainingSeconds: Math.max(0, record.expiresAt - nowSec)
            }, 200, corsOrigin);
        }

        // ==================== DELETE /shares/:shareId (Revoke Share) ====================
        if (pathname.startsWith("/shares/") && method === "DELETE") {
            const shareId = pathname.substring("/shares/".length).trim();

            if (!isValidShareId(shareId)) {
                return jsonResponse({ error: "Malformed share identifier." }, 400, corsOrigin);
            }

            const revocationToken = request.headers.get("X-Revocation-Token");
            if (!revocationToken || typeof revocationToken !== "string") {
                return jsonResponse({ error: "Revocation token is required." }, 401, corsOrigin);
            }

            if (!kv) {
                return jsonResponse({ error: "Storage backend is not configured." }, 503, corsOrigin);
            }

            let raw;
            try {
                raw = await kv.get(`share:${shareId}`);
            } catch (err) {
                return jsonResponse({ error: "Storage error." }, 500, corsOrigin);
            }

            if (!raw) {
                return jsonResponse({ error: "Share not found or already deleted." }, 404, corsOrigin);
            }

            let record;
            try {
                record = JSON.parse(raw);
            } catch (err) {
                return jsonResponse({ error: "Corrupted share record." }, 500, corsOrigin);
            }

            // Constant-time verification of revocation token
            const suppliedHash = await sha256Hex(revocationToken);
            if (!timingSafeEqualHex(suppliedHash, record.revocationHash)) {
                return jsonResponse({ error: "Invalid revocation token. Authorization denied." }, 403, corsOrigin);
            }

            // Delete immediately from KV
            try {
                await kv.delete(`share:${shareId}`);
            } catch (err) {
                return jsonResponse({ error: "Failed to revoke share." }, 500, corsOrigin);
            }

            return jsonResponse({
                success: true,
                message: "Share has been permanently revoked and deleted."
            }, 200, corsOrigin);
        }

        // Unhandled route
        return jsonResponse({ error: "Endpoint not found." }, 404, corsOrigin);
    }
};
