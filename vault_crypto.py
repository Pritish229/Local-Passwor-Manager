import os
import sys
import json
import base64
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, VerifyMismatchError
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.fernet import Fernet, InvalidToken

# Determine base directory
if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent

MASTER_PATH = Path("master.json") if Path("master.json").is_file() and not (BASE_DIR / "master.json").is_file() else BASE_DIR / "master.json"
STORE_PATH = Path("store.json") if Path("store.json").is_file() and not (BASE_DIR / "store.json").is_file() else BASE_DIR / "store.json"

ph = PasswordHasher()


def derive_key(password: str, salt: bytes, iterations: int = 200_000) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=iterations
    )
    raw = kdf.derive(password.encode())
    return base64.urlsafe_b64encode(raw)


def is_vault_initialized() -> bool:
    return MASTER_PATH.is_file()


def initialize_vault(password: str) -> str:
    """Creates a new master vault with master password and returns the one-time recovery key."""
    scram = ph.hash(password)
    salt = os.urandom(16)

    vault_key = Fernet.generate_key()
    recovery_key = Fernet.generate_key()

    derived_master_key = derive_key(password, salt)
    encrypted_vault_key_A = Fernet(derived_master_key).encrypt(vault_key)
    encrypted_vault_key_B = Fernet(recovery_key).encrypt(vault_key)

    data = {
        "master_hash": scram,
        "salt": base64.b64encode(salt).decode(),
        "vk_a": base64.b64encode(encrypted_vault_key_A).decode(),
        "vk_b": base64.b64encode(encrypted_vault_key_B).decode()
    }

    with open(MASTER_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

    # Ensure store file exists
    if not STORE_PATH.is_file():
        with open(STORE_PATH, "w", encoding="utf-8") as f:
            json.dump({}, f, indent=4)

    return recovery_key.decode()


def unlock_vault(password: str) -> Optional[Fernet]:
    """Authenticates the master password and returns a Fernet instance."""
    if not MASTER_PATH.is_file():
        return None

    try:
        with open(MASTER_PATH, "r", encoding="utf-8") as f:
            mp = json.load(f)

        master_hash = mp['master_hash']
        salt = base64.b64decode(mp['salt'])
        vk_a = base64.b64decode(mp['vk_a'])

        ph.verify(master_hash, password)
        derived = derive_key(password, salt)
        f_master = Fernet(derived)
        dec_vault_key = f_master.decrypt(vk_a)
        return Fernet(dec_vault_key)
    except (VerifyMismatchError, VerificationError, InvalidToken, Exception):
        return None


def recover_vault(recovery_key_str: str, new_password: str) -> bool:
    """Recovers the vault using a recovery key and sets a new master password."""
    if not MASTER_PATH.is_file():
        return False

    try:
        with open(MASTER_PATH, "r", encoding="utf-8") as f:
            master_data = json.load(f)

        vk_b = base64.b64decode(master_data['vk_b'])
        recovery_key_bytes = recovery_key_str.strip().encode()
        vault_key = Fernet(recovery_key_bytes).decrypt(vk_b)

        new_master_hash = ph.hash(new_password)
        salt = base64.b64decode(master_data['salt'])
        new_derived_key = derive_key(new_password, salt)
        new_vk_a = Fernet(new_derived_key).encrypt(vault_key)

        master_data['master_hash'] = new_master_hash
        master_data['vk_a'] = base64.b64encode(new_vk_a).decode()

        with open(MASTER_PATH, "w", encoding="utf-8") as f:
            json.dump(master_data, f, indent=4)

        return True
    except Exception:
        return False


def load_raw_store() -> Dict[str, Any]:
    if STORE_PATH.is_file():
        try:
            with open(STORE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, dict) else {}
        except Exception:
            return {}
    return {}


def save_raw_store(data: Dict[str, Any]) -> None:
    with open(STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)


def deduplicate_recent_activity(recent_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Deduplicates recent activity records by entry_id and (title + uname) ensuring strictly unique password records."""
    if not isinstance(recent_list, list):
        return []
    seen_ids = set()
    seen_combos = set()
    deduped = []
    for evt in recent_list:
        if not isinstance(evt, dict):
            continue
        eid = evt.get("entry_id")
        title = (evt.get("title") or "").strip().lower()
        uname = (evt.get("uname") or "").strip().lower()
        combo = f"{title}::{uname}"
        
        if eid and eid in seen_ids:
            continue
        if combo and combo in seen_combos and (title or uname):
            continue

        if eid:
            seen_ids.add(eid)
        if title or uname:
            seen_combos.add(combo)

        deduped.append(evt)
    return deduped


def get_all_entries_decrypted(fernet: Fernet) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
    """Loads all password entries and recent activity, decrypting passwords and secret custom fields."""
    raw = load_raw_store()
    entries = []
    recent_activity = deduplicate_recent_activity(raw.get("_recent_activity", []))
    if raw.get("_recent_activity") != recent_activity:
        raw["_recent_activity"] = recent_activity
        save_raw_store(raw)

    for category, items in raw.items():
        if category == "_recent_activity":
            continue
        if not isinstance(items, list):
            continue

        for idx, item in enumerate(items):
            entry_id = item.get("id", f"{category}-{idx}")
            title = item.get("title") or item.get("uname") or category
            uname = item.get("uname", "")
            encrypted_pw = item.get("pw", "")
            
            try:
                decrypted_pw = fernet.decrypt(encrypted_pw.encode()).decode()
            except Exception:
                decrypted_pw = "[Decryption Failed]"

            # Process custom fields
            custom_fields = []
            raw_fields = item.get("custom_fields", [])
            for cf in raw_fields:
                cf_name = cf.get("name", "")
                cf_val = cf.get("value", "")
                is_secret = cf.get("is_secret", False)
                if is_secret and cf_val:
                    try:
                        cf_val = fernet.decrypt(cf_val.encode()).decode()
                    except Exception:
                        pass
                custom_fields.append({
                    "name": cf_name,
                    "value": cf_val,
                    "is_secret": is_secret
                })

            entries.append({
                "id": entry_id,
                "category": category,
                "title": title,
                "uname": uname,
                "password": decrypted_pw,
                "custom_fields": custom_fields,
                "avatar": item.get("avatar"),
                "created_at": item.get("created_at"),
                "updated_at": item.get("updated_at")
            })

    categories = get_all_categories()
    return entries, recent_activity, categories


def add_or_update_entry(
    fernet: Fernet,
    category: str,
    uname: str,
    password: str,
    title: Optional[str] = None,
    custom_fields: Optional[List[Dict[str, Any]]] = None,
    entry_id: Optional[str] = None,
    avatar: Optional[str] = None
) -> Dict[str, Any]:
    """Adds a new entry or updates an existing one."""
    raw = load_raw_store()
    category = (category or "").strip() or "Uncategorized"
    uname = uname.strip()
    title = (title or uname or category).strip()

    if category not in raw or not isinstance(raw[category], list):
        raw[category] = []

    # Encrypt password
    encrypted_pw = fernet.encrypt(password.encode()).decode()

    # Process & encrypt secret custom fields
    encrypted_fields = []
    if custom_fields:
        for f in custom_fields:
            fname = str(f.get("name", "")).strip()
            fval = str(f.get("value", ""))
            is_secret = bool(f.get("is_secret", False))
            if not fname:
                continue
            if is_secret and fval:
                val_to_save = fernet.encrypt(fval.encode()).decode()
            else:
                val_to_save = fval
            encrypted_fields.append({
                "name": fname,
                "value": val_to_save,
                "is_secret": is_secret
            })

    import time
    now_ts = int(time.time())

    # Find if editing existing
    target_idx = -1
    existing_avatar = None
    if entry_id:
        for cat_name, items in raw.items():
            if cat_name == "_recent_activity" or not isinstance(items, list):
                continue
            for i, itm in enumerate(items):
                if itm.get("id") == entry_id:
                    existing_avatar = itm.get("avatar")
                    # Remove from old category if category changed
                    if cat_name != category:
                        items.pop(i)
                    else:
                        target_idx = i
                    break

    final_avatar = avatar if avatar is not None else existing_avatar
    new_id = entry_id or f"entry_{now_ts}_{os.urandom(4).hex()}"
    entry_data = {
        "id": new_id,
        "title": title,
        "uname": uname,
        "pw": encrypted_pw,
        "custom_fields": encrypted_fields,
        "avatar": final_avatar,
        "updated_at": now_ts
    }

    if target_idx >= 0 and target_idx < len(raw[category]):
        entry_data["created_at"] = raw[category][target_idx].get("created_at", now_ts)
        raw[category][target_idx] = entry_data
    else:
        entry_data["created_at"] = now_ts
        raw[category].append(entry_data)

    # Keep recent activity updated with latest title, username, and category
    if "_recent_activity" in raw and isinstance(raw["_recent_activity"], list):
        for evt in raw["_recent_activity"]:
            if evt.get("entry_id") == new_id:
                evt["title"] = title
                evt["uname"] = uname
                evt["category"] = category
        raw["_recent_activity"] = deduplicate_recent_activity(raw["_recent_activity"])

    save_raw_store(raw)

    return {
        "id": new_id,
        "category": category,
        "title": title,
        "uname": uname,
        "password": password,
        "custom_fields": custom_fields or [],
        "avatar": final_avatar,
        "created_at": entry_data.get("created_at"),
        "updated_at": now_ts
    }


def bulk_add_entries(
    fernet: Fernet,
    entries: List[Dict[str, Any]],
    target_category: str = "Uncategorized"
) -> List[Dict[str, Any]]:
    """Bulk adds multiple credential entries in a single atomic file write."""
    raw = load_raw_store()
    target_category = (target_category or "").strip() or "Uncategorized"

    if target_category not in raw or not isinstance(raw[target_category], list):
        raw[target_category] = []

    import time
    now_ts = int(time.time())
    created_list = []

    for item in entries:
        uname = str(item.get("uname", "")).strip()
        pw = str(item.get("password", "") or item.get("pw", ""))
        if not uname or not pw:
            continue

        title = (item.get("title") or uname or target_category).strip()
        cat = (item.get("category") or target_category).strip() or target_category

        if cat not in raw or not isinstance(raw[cat], list):
            raw[cat] = []

        encrypted_pw = fernet.encrypt(pw.encode()).decode()
        new_id = f"entry_{now_ts}_{os.urandom(4).hex()}"

        custom_fields = item.get("custom_fields", [])
        encrypted_fields = []
        if custom_fields:
            for f in custom_fields:
                fname = str(f.get("name", "")).strip()
                fval = str(f.get("value", ""))
                is_secret = bool(f.get("is_secret", False))
                if not fname:
                    continue
                if is_secret and fval:
                    val_to_save = fernet.encrypt(fval.encode()).decode()
                else:
                    val_to_save = fval
                encrypted_fields.append({
                    "name": fname,
                    "value": val_to_save,
                    "is_secret": is_secret
                })

        entry_data = {
            "id": new_id,
            "title": title,
            "uname": uname,
            "pw": encrypted_pw,
            "custom_fields": encrypted_fields,
            "avatar": item.get("avatar") or None,
            "created_at": now_ts,
            "updated_at": now_ts
        }

        raw[cat].append(entry_data)
        created_list.append({
            "id": new_id,
            "title": title,
            "uname": uname,
            "category": cat
        })

    if created_list:
        save_raw_store(raw)

    return created_list


def create_category(category_name: str) -> Tuple[bool, List[str]]:
    """Creates a new category if it doesn't already exist."""
    raw = load_raw_store()
    category_name = category_name.strip()
    if not category_name or category_name == "_recent_activity":
        return False, get_all_categories()
    
    if category_name not in raw:
        raw[category_name] = []
        save_raw_store(raw)
        return True, get_all_categories()
    return True, get_all_categories()


def get_all_categories() -> List[str]:
    raw = load_raw_store()
    cats = [k for k in raw.keys() if k != "_recent_activity" and isinstance(raw[k], list)]
    if "Uncategorized" not in cats:
        cats.append("Uncategorized")
    return sorted(list(set(cats)))


def move_entry_category(entry_id: str, new_category: str) -> bool:
    """Moves an entry from its current category to a new category without re-encrypting."""
    raw = load_raw_store()
    new_category = (new_category or "").strip() or "Uncategorized"

    if new_category not in raw or not isinstance(raw[new_category], list):
        raw[new_category] = []

    found_item = None
    for cat_name, items in raw.items():
        if cat_name == "_recent_activity" or not isinstance(items, list):
            continue
        for i, itm in enumerate(items):
            if itm.get("id") == entry_id:
                found_item = items.pop(i)
                break
        if found_item:
            break

    if found_item:
        import time
        found_item["updated_at"] = int(time.time())
        raw[new_category].append(found_item)
        # Update category in recent activity
        for evt in raw.get("_recent_activity", []):
            if evt.get("entry_id") == entry_id:
                evt["category"] = new_category
        save_raw_store(raw)
        return True
    return False


def delete_entry(entry_id: str, title: Optional[str] = None, uname: Optional[str] = None) -> bool:
    """Deletes an entry by its ID or title/uname across categories and completely purges it from recent uses."""
    raw = load_raw_store()
    deleted = False
    deleted_title = (title or "").strip().lower()
    deleted_uname = (uname or "").strip().lower()

    for category, items in list(raw.items()):
        if category == "_recent_activity" or not isinstance(items, list):
            continue
        for i, item in enumerate(items):
            itm_id = item.get("id", f"{category}-{i}")
            itm_title = (item.get("title") or "").strip().lower()
            itm_uname = (item.get("uname") or "").strip().lower()

            matches_id = bool(entry_id and (itm_id == entry_id or item.get("id") == entry_id))
            matches_cred = bool(deleted_title and deleted_uname and itm_title == deleted_title and itm_uname == deleted_uname)

            if matches_id or matches_cred:
                deleted_title = itm_title or deleted_title
                deleted_uname = itm_uname or deleted_uname
                items.pop(i)
                deleted = True
                break
        if deleted:
            break

    if deleted:
        # Clean up any recent activity for this deleted entry by ID or by (title + uname)
        if "_recent_activity" in raw and isinstance(raw["_recent_activity"], list):
            raw["_recent_activity"] = [
                e for e in raw["_recent_activity"]
                if e.get("entry_id") != entry_id and not (
                    (e.get("title") or "").strip().lower() == deleted_title and
                    (e.get("uname") or "").strip().lower() == deleted_uname
                )
            ]
        save_raw_store(raw)
    return deleted


def rename_category(old_name: str, new_name: str) -> Tuple[bool, str, List[str]]:
    """Renames an existing category and moves all items to the new category name."""
    old_name = (old_name or "").strip()
    new_name = (new_name or "").strip()

    if not old_name or not new_name:
        return False, "Category names cannot be empty.", get_all_categories()

    if old_name == new_name:
        return True, "No changes made.", get_all_categories()

    if new_name == "_recent_activity":
        return False, "Invalid category name.", get_all_categories()

    raw = load_raw_store()
    if old_name not in raw and old_name.lower() != "uncategorized":
        return False, f"Category '{old_name}' not found.", get_all_categories()

    if new_name in raw and new_name.lower() != old_name.lower() and isinstance(raw[new_name], list) and len(raw[new_name]) > 0:
        return False, f"Category '{new_name}' already exists and is not empty.", get_all_categories()

    # Move entries from old_name to new_name
    entries = raw.pop(old_name, [])
    if old_name.lower() == "uncategorized":
        raw["Uncategorized"] = []

    if new_name not in raw or not isinstance(raw[new_name], list):
        raw[new_name] = []
    raw[new_name].extend(entries)

    # Update recent activity categories if any
    for evt in raw.get("_recent_activity", []):
        if evt.get("category") == old_name:
            evt["category"] = new_name

    save_raw_store(raw)
    return True, f"Renamed '{old_name}' to '{new_name}'.", get_all_categories()


def delete_category(category_name: str) -> Tuple[bool, str, List[str]]:
    """Deletes a category folder ONLY if it has zero passwords inside (Requirement 3)."""
    category_name = (category_name or "").strip()

    if not category_name or category_name.lower() == "uncategorized" or category_name == "_recent_activity":
        return False, "Cannot delete default system categories.", get_all_categories()

    raw = load_raw_store()
    # Find matching key case-insensitively
    matched_key = None
    for k in list(raw.keys()):
        if k.strip().lower() == category_name.lower():
            matched_key = k
            break

    if not matched_key:
        return False, f"Category '{category_name}' does not exist.", get_all_categories()

    items = raw.get(matched_key, [])
    if isinstance(items, list) and len(items) > 0:
        return False, f"Cannot delete '{matched_key}' because it contains {len(items)} password(s). Move or delete passwords first.", get_all_categories()

    if matched_key in raw:
        del raw[matched_key]
    save_raw_store(raw)
    return True, f"Category '{matched_key}' deleted.", get_all_categories()


def record_recent_use(entry_id: str, title: str, category: str, uname: str, action: str = "copied_password") -> List[Dict[str, Any]]:
    """Records an access event to the recent uses list ensuring strictly unique password records."""
    import time
    raw = load_raw_store()
    recent = raw.get("_recent_activity", [])
    if not isinstance(recent, list):
        recent = []

    now_ts = int(time.time())
    event = {
        "id": f"evt_{now_ts}_{os.urandom(3).hex()}",
        "entry_id": entry_id,
        "title": title,
        "category": category,
        "uname": uname,
        "action": action, # 'copied_password', 'copied_username', 'viewed_details', 'copied_custom'
        "timestamp": now_ts
    }

    norm_title = (title or "").strip().lower()
    norm_uname = (uname or "").strip().lower()
    combo_key = f"{norm_title}::{norm_uname}"

    # Filter out any prior records that match either entry_id OR (title + username)
    filtered = []
    for e in recent:
        if not isinstance(e, dict):
            continue
        e_id = e.get("entry_id")
        e_title = (e.get("title") or "").strip().lower()
        e_uname = (e.get("uname") or "").strip().lower()
        e_combo = f"{e_title}::{e_uname}"

        # Deduplicate by entry_id
        if entry_id and e_id == entry_id:
            continue
        # Deduplicate by (title + username)
        if combo_key and e_combo == combo_key and (norm_title or norm_uname):
            continue

        filtered.append(e)

    # Prepend newest event at top and cap at 25 unique events
    recent = deduplicate_recent_activity([event] + filtered)[:25]
    raw["_recent_activity"] = recent
    save_raw_store(raw)
    return recent

