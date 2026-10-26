#!/usr/bin/env python
import os
import sys
import json
import mimetypes
import webbrowser
from pathlib import Path
from http import HTTPStatus
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse
from typing import Optional
from cryptography.fernet import Fernet

# Safe standard output handling when running without console (--noconsole / frozen)
if sys.stdout is None:
    try:
        sys.stdout = open(os.devnull, 'w')
    except Exception:
        pass
if sys.stderr is None:
    try:
        sys.stderr = open(os.devnull, 'w')
    except Exception:
        pass

import vault_crypto

# Base directory & static directory determination
if getattr(sys, 'frozen', False):
    BUNDLE_DIR = Path(getattr(sys, '_MEIPASS', sys.executable)).resolve()
    DATA_DIR = Path(sys.executable).resolve().parent
    STATIC_DIR = BUNDLE_DIR / "static"
    if not STATIC_DIR.is_dir():
        STATIC_DIR = DATA_DIR / "static"
else:
    DATA_DIR = Path(__file__).resolve().parent
    STATIC_DIR = DATA_DIR / "static"

BASE_DIR = DATA_DIR

import base64
import secrets
import time
import hashlib
import hmac

SESSION_FILE = BASE_DIR / ".session_token"
PREFERENCES_FILE = BASE_DIR / "preferences.json"

ACTIVE_SHARES = {}

def clean_expired_shares():
    now = time.time()
    expired = [k for k, v in ACTIVE_SHARES.items() if now > v.get("expires_at", 0) or v.get("viewed")]
    for k in expired:
        ACTIVE_SHARES.pop(k, None)

DEFAULT_PREFERENCES = {
    "layout": "classic",
    "theme": "dark",
    "view_mode": "grid",
    "sidebar_collapsed": False,
    "category_icons": {},
    "button_colors": {
        "dark": {
            "primary_bg": "#ffffff",
            "primary_text": "#111111",
            "secondary_bg": "#262626",
            "secondary_text": "#ffffff",
            "primary_hover": "#e5e5e5",
            "secondary_hover": "#333333",
            "accent": "#ffffff"
        },
        "light": {
            "primary_bg": "#18181b",
            "primary_text": "#ffffff",
            "secondary_bg": "#f4f4f5",
            "secondary_text": "#18181b",
            "primary_hover": "#27272a",
            "secondary_hover": "#e4e4e7",
            "accent": "#18181b"
        }
    },
    "shortcuts": {
        "command_palette": "Ctrl+K",
        "settings": "Ctrl+,",
        "toggle_layout": "Ctrl+Shift+L",
        "toggle_theme": "Ctrl+Shift+D",
        "shortcuts_modal": "Ctrl+/",
        "new_category": "Ctrl+Shift+F",
        "new_password": "Ctrl+Shift+A",
        "quick_generator": "Ctrl+Shift+G"
    },
    "sharing": {
        "api_url": "https://vaultkey-share-api.pritishdash44.workers.dev",
        "viewer_url": "https://vaultkey-secret.pages.dev"
    }
}

def load_preferences() -> dict:
    if not PREFERENCES_FILE.is_file():
        return json.loads(json.dumps(DEFAULT_PREFERENCES))
    try:
        with open(PREFERENCES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, dict):
                return json.loads(json.dumps(DEFAULT_PREFERENCES))
            merged = json.loads(json.dumps(DEFAULT_PREFERENCES))
            for k, v in data.items():
                if k == "category_icons":
                    merged[k] = v if isinstance(v, dict) else {}
                elif k in merged and isinstance(v, dict) and isinstance(merged[k], dict):
                    merged[k].update(v)
                else:
                    merged[k] = v
            return merged
    except Exception:
        return json.loads(json.dumps(DEFAULT_PREFERENCES))

def save_preferences(data: dict) -> dict:
    if not isinstance(data, dict):
        data = {}
    current = load_preferences()
    for k, v in data.items():
        if k == "category_icons":
            current[k] = v if isinstance(v, dict) else {}
        elif k in current and isinstance(v, dict) and isinstance(current[k], dict):
            current[k].update(v)
        else:
            current[k] = v
    try:
        with open(PREFERENCES_FILE, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=4)
    except Exception:
        pass
    return current

def reset_preferences(section: Optional[str] = None) -> dict:
    current = load_preferences()
    if not section or section == "all":
        current = json.loads(json.dumps(DEFAULT_PREFERENCES))
    elif section in DEFAULT_PREFERENCES:
        current[section] = json.loads(json.dumps(DEFAULT_PREFERENCES[section]))
    try:
        with open(PREFERENCES_FILE, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=4)
    except Exception:
        pass
    return current

class SessionState:
    @property
    def vault_fernet(self) -> Optional[Fernet]:
        if not hasattr(self, "_fernet") or self._fernet is None:
            if SESSION_FILE.is_file():
                try:
                    with open(SESSION_FILE, "rb") as f:
                        key = f.read().strip()
                        if key:
                            self._fernet = Fernet(key)
                except Exception:
                    self._fernet = None
        return getattr(self, "_fernet", None)

    @vault_fernet.setter
    def vault_fernet(self, f: Optional[Fernet]):
        self._fernet = f
        if f is not None:
            try:
                raw_key = base64.urlsafe_b64encode(f._signing_key + f._encryption_key)
                with open(SESSION_FILE, "wb") as sf:
                    sf.write(raw_key)
            except Exception:
                pass
        else:
            if SESSION_FILE.is_file():
                try:
                    os.remove(SESSION_FILE)
                except Exception:
                    pass

session = SessionState()


class VaultRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def end_headers(self):
        # Security and cache headers for SaaS application
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Revocation-Token")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def _send_json(self, status: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> dict:
        content_len = int(self.headers.get("Content-Length", 0))
        if content_len == 0:
            return {}
        raw = self.rfile.read(content_len)
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path in ("/health", "/api/health"):
            self._send_json(HTTPStatus.OK, {"status": "ok", "service": "vaultkey-local-server"})
            return

        if path.startswith("/shares/") or path.startswith("/api/shares/"):
            prefix = "/shares/" if path.startswith("/shares/") else "/api/shares/"
            sub = path[len(prefix):].strip()
            
            clean_expired_shares()
            share_item = ACTIVE_SHARES.get(sub)
            if not share_item:
                self._send_json(HTTPStatus.NOT_FOUND, {"error": "This share link does not exist, has expired, or was already burned."})
                return
            now = time.time()
            if share_item.get("revoked"):
                self._send_json(HTTPStatus.GONE, {"error": "This share has been revoked by the sender."})
                return
            if now >= share_item.get("expires_at", 0):
                ACTIVE_SHARES.pop(sub, None)
                self._send_json(HTTPStatus.GONE, {"error": "This share link has expired."})
                return

            if share_item.get("pin_hash"):
                self._send_json(HTTPStatus.OK, {
                    "valid": True,
                    "requiresPin": True,
                    "title": share_item.get("title", "Protected Credential"),
                    "uname": share_item.get("uname", ""),
                    "salt": share_item.get("salt", ""),
                    "expiresAt": int(share_item["expires_at"]),
                    "remainingSeconds": max(0, int(share_item["expires_at"] - now))
                })
                return

            self._send_json(HTTPStatus.OK, {
                "ciphertext": share_item["ciphertext"],
                "iv": share_item["iv"],
                "expiresAt": int(share_item["expires_at"]),
                "remainingSeconds": max(0, int(share_item["expires_at"] - now))
            })
            return

        if path == "/api/status":
            self._send_json(HTTPStatus.OK, {
                "initialized": vault_crypto.is_vault_initialized(),
                "unlocked": session.vault_fernet is not None
            })
            return

        if path == "/api/preferences":
            self._send_json(HTTPStatus.OK, load_preferences())
            return

        if path == "/api/categories":
            if session.vault_fernet is None:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "Vault is locked."})
                return
            self._send_json(HTTPStatus.OK, {"categories": vault_crypto.get_all_categories()})
            return

        if path == "/api/entries":
            if session.vault_fernet is None:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "Vault is locked."})
                return

            entries, recent, categories = vault_crypto.get_all_entries_decrypted(session.vault_fernet)
            self._send_json(HTTPStatus.OK, {
                "entries": entries,
                "recent_activity": recent,
                "categories": categories,
                "stats": {
                    "total": len(entries),
                    "categories_count": len(categories),
                    "recent_count": len(recent)
                }
            })
            return

        if path.startswith("/share/"):
            share_file = STATIC_DIR / "share.html"
            if share_file.is_file():
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                self.end_headers()
                with open(share_file, "rb") as f:
                    self.wfile.write(f.read())
                return
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Share page not found."})
            return

        if path.startswith("/api/share/info/"):
            token = path[len("/api/share/info/"):].strip()
            clean_expired_shares()
            share_item = ACTIVE_SHARES.get(token)
            if not share_item:
                self._send_json(HTTPStatus.NOT_FOUND, {"error": "Shared link not found or expired."})
                return
            rem = int(share_item["expires_at"] - time.time())
            if rem <= 0:
                ACTIVE_SHARES.pop(token, None)
                self._send_json(HTTPStatus.GONE, {"error": "This link has expired."})
                return
            self._send_json(HTTPStatus.OK, {
                "valid": True,
                "title": share_item.get("title", "Protected Credential"),
                "uname": share_item.get("uname", ""),
                "expires_in": rem
            })
            return

        # Fallback to static files
        if path == "/" or not path or path == "/index.html":
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/register":
            if vault_crypto.is_vault_initialized():
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Vault is already initialized."})
                return
            body = self._read_json_body()
            password = body.get("password", "").strip()
            if not password or len(password) < 4:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Master password must be at least 4 characters."})
                return
            
            recovery_key = vault_crypto.initialize_vault(password)
            # Auto-unlock upon creation
            session.vault_fernet = vault_crypto.unlock_vault(password)
            self._send_json(HTTPStatus.OK, {
                "success": True,
                "recovery_key": recovery_key
            })
            return

        if path == "/api/login":
            body = self._read_json_body()
            password = body.get("password", "")
            f = vault_crypto.unlock_vault(password)
            if f is None:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "Incorrect master password."})
                return
            session.vault_fernet = f
            self._send_json(HTTPStatus.OK, {"success": True})
            return

        if path == "/api/logout":
            session.vault_fernet = None
            self._send_json(HTTPStatus.OK, {"success": True})
            return

        if path == "/api/recover":
            body = self._read_json_body()
            rec_key = body.get("recovery_key", "").strip()
            new_pw = body.get("new_password", "").strip()
            if not rec_key or not new_pw:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Recovery key and new password are required."})
                return
            
            ok = vault_crypto.recover_vault(rec_key, new_pw)
            if not ok:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid recovery key."})
                return
            session.vault_fernet = vault_crypto.unlock_vault(new_pw)
            self._send_json(HTTPStatus.OK, {"success": True})
            return

        if path == "/api/entries":
            if session.vault_fernet is None:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "Vault is locked."})
                return
            body = self._read_json_body()
            category = body.get("category", "General").strip() or "General"
            uname = body.get("uname", "").strip()
            password = body.get("password", "")
            title = body.get("title", "").strip()
            custom_fields = body.get("custom_fields", [])
            
            if not uname:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Username/Email cannot be empty."})
                return
            if not password:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Password cannot be empty."})
                return

            avatar = body.get("avatar")
            saved = vault_crypto.add_or_update_entry(
                fernet=session.vault_fernet,
                category=category,
                uname=uname,
                password=password,
                title=title,
                custom_fields=custom_fields,
                avatar=avatar
            )
            self._send_json(HTTPStatus.CREATED, {"success": True, "entry": saved})
            return

        if path == "/api/entries/bulk":
            if session.vault_fernet is None:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "Vault is locked."})
                return
            body = self._read_json_body()
            entries = body.get("entries", [])
            target_category = body.get("category", "Uncategorized").strip() or "Uncategorized"
            if not isinstance(entries, list):
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Entries must be a list."})
                return
            saved = vault_crypto.bulk_add_entries(session.vault_fernet, entries, target_category)
            self._send_json(HTTPStatus.CREATED, {"success": True, "count": len(saved), "entries": saved})
            return

        if path == "/api/recent":
            if session.vault_fernet is None:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "Vault is locked."})
                return
            body = self._read_json_body()
            entry_id = body.get("entry_id", "")
            title = body.get("title", "")
            category = body.get("category", "")
            uname = body.get("uname", "")
            action = body.get("action", "copied_password")
            
            updated_recent = vault_crypto.record_recent_use(entry_id, title, category, uname, action)
            self._send_json(HTTPStatus.OK, {"success": True, "recent_activity": updated_recent})
            return

        if path == "/api/categories":
            if session.vault_fernet is None:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "Vault is locked."})
                return
            body = self._read_json_body()
            category_name = body.get("category", "").strip()
            if not category_name:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Category name cannot be empty."})
                return
            ok, categories = vault_crypto.create_category(category_name)
            self._send_json(HTTPStatus.OK, {"success": ok, "categories": categories})
            return

        if path == "/api/preferences":
            body = self._read_json_body()
            saved = save_preferences(body)
            self._send_json(HTTPStatus.OK, {"success": True, "preferences": saved})
            return

        if path == "/api/preferences/reset":
            body = self._read_json_body()
            section = body.get("section")
            reset_data = reset_preferences(section)
            self._send_json(HTTPStatus.OK, {"success": True, "preferences": reset_data})
            return

        if path.startswith("/shares/") and path.endswith("/unlock"):
            sub = path[len("/shares/"):len(path) - len("/unlock")].strip()
            clean_expired_shares()
            share_item = ACTIVE_SHARES.get(sub)
            if not share_item:
                self._send_json(HTTPStatus.NOT_FOUND, {"error": "This share link does not exist, has expired, or has already been burned."})
                return
            now = time.time()
            if share_item.get("revoked") or now >= share_item.get("expires_at", 0):
                ACTIVE_SHARES.pop(sub, None)
                self._send_json(HTTPStatus.GONE, {"error": "This share link has expired or was revoked."})
                return
            body = self._read_json_body()
            pin = str(body.get("pin") or body.get("code") or "").strip()
            if not pin or len(pin) != 4:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Please enter a valid 4-digit security code."})
                return
            
            stored_hash = share_item.get("pin_hash", "")
            salt = share_item.get("salt", "")
            computed_hash = hashlib.sha256((pin + salt).encode("utf-8")).hexdigest()

            if not hmac.compare_digest(computed_hash, stored_hash):
                share_item["failed_attempts"] = share_item.get("failed_attempts", 0) + 1
                remaining = 5 - share_item["failed_attempts"]
                if remaining <= 0:
                    ACTIVE_SHARES.pop(sub, None)
                    self._send_json(HTTPStatus.FORBIDDEN, {"error": "Too many incorrect attempts (5/5). Link has been burned and destroyed."})
                    return
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": f"Incorrect 4-digit code. {remaining} attempt{'s' if remaining != 1 else ''} remaining."})
                return

            # Success: burn/delete share immediately (one-time view)
            ACTIVE_SHARES.pop(sub, None)
            self._send_json(HTTPStatus.OK, {
                "success": True,
                "ciphertext": share_item["ciphertext"],
                "iv": share_item["iv"],
                "salt": share_item.get("salt", ""),
                "title": share_item.get("title", ""),
                "uname": share_item.get("uname", "")
            })
            return

        if path in ("/shares", "/api/shares"):
            body = self._read_json_body()
            ciphertext = body.get("ciphertext")
            iv = body.get("iv")
            expires_in = body.get("expires_in", 600)
            salt = body.get("salt", "")
            pin_hash = body.get("pin_hash", "")
            title = body.get("title", "")
            uname = body.get("uname", "")
            if not ciphertext or not iv:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "ciphertext and iv are required."})
                return
            try:
                expires_in = int(expires_in)
                if expires_in < 60 or expires_in > 604800:
                    expires_in = 600
            except (ValueError, TypeError):
                expires_in = 600
            share_id = secrets.token_urlsafe(18)
            revocation_token = secrets.token_urlsafe(32)
            rev_hash = hashlib.sha256(revocation_token.encode("utf-8")).hexdigest()
            now = time.time()
            expires_at = now + expires_in
            clean_expired_shares()
            ACTIVE_SHARES[share_id] = {
                "ciphertext": ciphertext,
                "iv": iv,
                "salt": salt,
                "pin_hash": pin_hash,
                "title": title,
                "uname": uname,
                "failed_attempts": 0,
                "created_at": now,
                "expires_at": expires_at,
                "revocation_hash": rev_hash
            }
            self._send_json(HTTPStatus.CREATED, {
                "success": True,
                "shareId": share_id,
                "expiresAt": int(expires_at),
                "expiresIn": expires_in,
                "revocationToken": revocation_token
            })
            return

        if path == "/api/share/create":
            if session.vault_fernet is None:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "Vault is locked."})
                return
            body = self._read_json_body()
            clean_expired_shares()
            
            entry_id = body.get("entry_id")
            title = body.get("title", "Shared Credential")
            uname = body.get("uname", "")
            password = body.get("password", "")
            custom_fields = body.get("custom_fields", [])

            # If entry_id provided without password, fetch it decrypted
            if entry_id and not password:
                entries, _, _ = vault_crypto.get_all_entries_decrypted(session.vault_fernet)
                for itm in entries:
                    if itm.get("id") == entry_id:
                        title = itm.get("title", title)
                        uname = itm.get("uname", uname)
                        password = itm.get("password", "")
                        custom_fields = itm.get("custom_fields", [])
                        break

            if not password:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "No password to share."})
                return

            token = secrets.token_urlsafe(16)
            pin = f"{secrets.randbelow(10000):04d}"
            now = time.time()
            ACTIVE_SHARES[token] = {
                "entry_id": entry_id,
                "title": title,
                "uname": uname,
                "password": password,
                "custom_fields": custom_fields,
                "pin_code": pin,
                "created_at": now,
                "expires_at": now + 600,  # 10 minutes (600s)
                "viewed": False,
                "attempts": 0
            }

            self._send_json(HTTPStatus.CREATED, {
                "success": True,
                "token": token,
                "share_token": token,
                "pin": pin,
                "pin_code": pin,
                "expires_in": 600,
                "expires_at": now + 600,
                "share_url": f"/share/{token}"
            })
            return

        if path == "/api/share/unlock":
            body = self._read_json_body()
            token = (body.get("token") or body.get("share_token") or "").strip()
            code = str(body.get("code") or body.get("pin") or "").strip()

            clean_expired_shares()
            share_item = ACTIVE_SHARES.get(token)
            if not share_item:
                self._send_json(HTTPStatus.GONE, {"error": "This link is invalid or has expired."})
                return

            now = time.time()
            if now > share_item["expires_at"]:
                ACTIVE_SHARES.pop(token, None)
                self._send_json(HTTPStatus.GONE, {"error": "This link has expired (10-minute limit exceeded)."})
                return

            if code != share_item["pin_code"]:
                share_item["attempts"] = share_item.get("attempts", 0) + 1
                if share_item["attempts"] >= 5:
                    ACTIVE_SHARES.pop(token, None)
                    self._send_json(HTTPStatus.GONE, {"error": "Too many failed attempts. Link self-destructed."})
                    return
                rem_attempts = 5 - share_item["attempts"]
                self._send_json(HTTPStatus.BAD_REQUEST, {
                    "error": f"Incorrect 4-digit code. {rem_attempts} attempts remaining."
                })
                return

            # Unlock successful - burn after reveal
            data = {
                "success": True,
                "title": share_item["title"],
                "uname": share_item["uname"],
                "password": share_item["password"],
                "custom_fields": share_item.get("custom_fields", [])
            }
            ACTIVE_SHARES.pop(token, None)
            self._send_json(HTTPStatus.OK, data)
            return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": "Endpoint not found."})

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/preferences":
            body = self._read_json_body()
            saved = save_preferences(body)
            self._send_json(HTTPStatus.OK, {"success": True, "preferences": saved})
            return

        if parsed.path == "/api/entries/category":
            if session.vault_fernet is None:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "Vault is locked."})
                return
            body = self._read_json_body()
            entry_id = body.get("id")
            new_cat = body.get("category", "")
            if not entry_id:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Entry ID is required."})
                return
            ok = vault_crypto.move_entry_category(entry_id, new_cat)
            self._send_json(HTTPStatus.OK, {"success": ok})
            return

        if parsed.path == "/api/entries":
            if session.vault_fernet is None:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "Vault is locked."})
                return
            body = self._read_json_body()
            entry_id = body.get("id")
            if not entry_id:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Entry ID required for update."})
                return
            
            category = body.get("category", "General").strip() or "General"
            uname = body.get("uname", "").strip()
            password = body.get("password", "")
            title = body.get("title", "").strip()
            custom_fields = body.get("custom_fields", [])

            if not uname or not password:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Username and password cannot be empty."})
                return

            avatar = body.get("avatar")
            saved = vault_crypto.add_or_update_entry(
                fernet=session.vault_fernet,
                category=category,
                uname=uname,
                password=password,
                title=title,
                custom_fields=custom_fields,
                entry_id=entry_id,
                avatar=avatar
            )
            self._send_json(HTTPStatus.OK, {"success": True, "entry": saved})
            return

        if parsed.path == "/api/categories":
            if session.vault_fernet is None:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "Vault is locked."})
                return
            body = self._read_json_body()
            old_name = body.get("old_name", "").strip()
            new_name = body.get("new_name", "").strip()
            if not old_name or not new_name:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Both old and new category names are required."})
                return
            ok, msg, cats = vault_crypto.rename_category(old_name, new_name)
            if ok:
                self._send_json(HTTPStatus.OK, {"success": True, "message": msg, "categories": cats})
            else:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": msg})
            return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": "Endpoint not found."})

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path.startswith("/shares/") or parsed.path.startswith("/api/shares/"):
            prefix = "/shares/" if parsed.path.startswith("/shares/") else "/api/shares/"
            share_id = parsed.path[len(prefix):].strip()
            rev_token = self.headers.get("X-Revocation-Token", "").strip()
            if not rev_token:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "Revocation token is required."})
                return
            share_item = ACTIVE_SHARES.get(share_id)
            if not share_item:
                self._send_json(HTTPStatus.NOT_FOUND, {"error": "Share not found or already deleted."})
                return
            supplied_hash = hashlib.sha256(rev_token.encode("utf-8")).hexdigest()
            if not hmac.compare_digest(supplied_hash, share_item.get("revocation_hash", "")):
                self._send_json(HTTPStatus.FORBIDDEN, {"error": "Invalid revocation token. Authorization denied."})
                return
            ACTIVE_SHARES.pop(share_id, None)
            self._send_json(HTTPStatus.OK, {"success": True, "message": "Share revoked successfully."})
            return

        if parsed.path == "/api/categories":
            if session.vault_fernet is None:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "Vault is locked."})
                return
            query = urllib.parse.parse_qs(parsed.query)
            cat_name = query.get("name", [None])[0]
            if not cat_name:
                body = self._read_json_body()
                cat_name = body.get("name")
            if not cat_name:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Category name is required."})
                return
            cat_name = urllib.parse.unquote(cat_name).strip()
            ok, msg, cats = vault_crypto.delete_category(cat_name)
            if ok:
                self._send_json(HTTPStatus.OK, {"success": True, "message": msg, "categories": cats})
            else:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": msg})
            return

        if parsed.path == "/api/entries":
            if session.vault_fernet is None:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "Vault is locked."})
                return
            query = urllib.parse.parse_qs(parsed.query)
            entry_id = query.get("id", [None])[0]
            title = query.get("title", [None])[0]
            uname = query.get("uname", [None])[0]
            if not entry_id:
                body = self._read_json_body()
                entry_id = body.get("id")
                title = body.get("title")
                uname = body.get("uname")

            if not entry_id and not (title and uname):
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Missing entry identifier."})
                return

            if title:
                title = urllib.parse.unquote(title).strip()
            if uname:
                uname = urllib.parse.unquote(uname).strip()

            deleted = vault_crypto.delete_entry(entry_id or "", title, uname)
            if deleted:
                self._send_json(HTTPStatus.OK, {"success": True})
            else:
                self._send_json(HTTPStatus.NOT_FOUND, {"error": "Entry not found."})
            return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": "Endpoint not found."})


import subprocess

def launch_desktop_window(url: str):
    """
    Launch application in standalone desktop window mode.
    Disables browser address bar, navigation buttons, and bookmarks tab strip.
    """
    candidates = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
    ]
    
    app_profile = os.path.join(os.environ.get('LOCALAPPDATA', os.path.expanduser('~')), 'VaultKey', 'AppProfile')
    try:
        os.makedirs(app_profile, exist_ok=True)
    except Exception:
        pass

    for exe in candidates:
        if os.path.isfile(exe):
            try:
                cmd = [
                    exe,
                    f"--app={url}",
                    f"--user-data-dir={app_profile}",
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--disable-features=Translate,OptimizationHints,MediaRouter",
                    "--disable-infobars",
                    "--disable-component-update",
                    "--disable-notifications",
                    "--window-size=1300,850",
                ]
                return subprocess.Popen(cmd)
            except Exception:
                pass

    try:
        webbrowser.open(url)
    except Exception:
        pass
    return None


def check_existing_server(port: int = 5432) -> Optional[str]:
    """Check if a VaultKey local server is already running."""
    import urllib.request
    for p in range(port, port + 10):
        try:
            req = urllib.request.Request(f"http://127.0.0.1:{p}/api/health", headers={"User-Agent": "VaultKeyLauncher"})
            with urllib.request.urlopen(req, timeout=0.6) as resp:
                if resp.status == 200:
                    return f"http://127.0.0.1:{p}"
        except Exception:
            continue
    return None


def run_server(port: int = 5432, open_browser: bool = True):
    # Check if VaultKey is already running
    existing_url = check_existing_server(port)
    if existing_url:
        if open_browser:
            launch_desktop_window(existing_url)
        return

    # Try port, or increment if busy
    max_attempts = 10
    httpd = None
    actual_port = port
    for i in range(max_attempts):
        try:
            httpd = HTTPServer(("127.0.0.1", port + i), VaultRequestHandler)
            actual_port = port + i
            break
        except OSError:
            continue

    if not httpd:
        sys.exit(1)

    url = f"http://127.0.0.1:{actual_port}"

    if open_browser:
        launch_desktop_window(url)

    try:
        httpd.serve_forever()
    except (KeyboardInterrupt, SystemExit):
        httpd.server_close()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Local Password Manager SaaS UI")
    parser.add_argument("--port", type=int, default=5432, help="Port to run the local server on")
    parser.add_argument("--no-browser", action="store_true", help="Do not automatically open browser")
    args = parser.parse_args()

    run_server(port=args.port, open_browser=not args.no_browser)
