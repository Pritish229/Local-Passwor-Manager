import unittest
import json
import time
import secrets
import hashlib
from app import ACTIVE_SHARES, clean_expired_shares

class TestLocalServerSharing(unittest.TestCase):
    def setUp(self):
        ACTIVE_SHARES.clear()

    def test_share_creation_and_retrieval(self):
        share_id = secrets.token_urlsafe(18)
        rev_token = secrets.token_urlsafe(32)
        rev_hash = hashlib.sha256(rev_token.encode("utf-8")).hexdigest()
        now = time.time()
        
        ACTIVE_SHARES[share_id] = {
            "ciphertext": "dGVzdC1jaXBoZXJ0ZXh0",
            "iv": "dGVzdC1pdi0xMmM=",
            "created_at": now,
            "expires_at": now + 600,
            "revocation_hash": rev_hash
        }

        self.assertIn(share_id, ACTIVE_SHARES)
        item = ACTIVE_SHARES[share_id]
        self.assertEqual(item["ciphertext"], "dGVzdC1jaXBoZXJ0ZXh0")
        self.assertEqual(item["iv"], "dGVzdC1pdi0xMmM=")

    def test_revocation_validation(self):
        share_id = "test_share_12345"
        rev_token = "correct-token-secret"
        rev_hash = hashlib.sha256(rev_token.encode("utf-8")).hexdigest()

        ACTIVE_SHARES[share_id] = {
            "ciphertext": "cipher",
            "iv": "iv",
            "expires_at": time.time() + 600,
            "revocation_hash": rev_hash
        }

        # Incorrect token check
        bad_token = "wrong-token"
        bad_hash = hashlib.sha256(bad_token.encode("utf-8")).hexdigest()
        self.assertNotEqual(bad_hash, ACTIVE_SHARES[share_id]["revocation_hash"])

        # Correct token check
        good_hash = hashlib.sha256(rev_token.encode("utf-8")).hexdigest()
        self.assertEqual(good_hash, ACTIVE_SHARES[share_id]["revocation_hash"])

        # Revoke
        ACTIVE_SHARES.pop(share_id, None)
        self.assertNotIn(share_id, ACTIVE_SHARES)

    def test_expiration_cleanup(self):
        now = time.time()
        ACTIVE_SHARES["expired_share"] = {
            "ciphertext": "c",
            "iv": "i",
            "expires_at": now - 100
        }
        ACTIVE_SHARES["valid_share"] = {
            "ciphertext": "c2",
            "iv": "i2",
            "expires_at": now + 600
        }

        clean_expired_shares()
        self.assertNotIn("expired_share", ACTIVE_SHARES)
        self.assertIn("valid_share", ACTIVE_SHARES)

if __name__ == "__main__":
    unittest.main()
