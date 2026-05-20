import time
from copy import deepcopy
from threading import Lock


class TTLCache:
    def __init__(self, ttl_seconds=15, max_items=256):
        self.ttl_seconds = ttl_seconds
        self.max_items = max_items
        self._items = {}
        self._lock = Lock()

    def get(self, key):
        now = time.monotonic()
        with self._lock:
            item = self._items.get(key)
            if not item:
                return None

            expires_at, value = item
            if expires_at <= now:
                self._items.pop(key, None)
                return None

            return deepcopy(value)

    def set(self, key, value):
        now = time.monotonic()
        with self._lock:
            if len(self._items) >= self.max_items:
                self._evict(now)
            self._items[key] = (now + self.ttl_seconds, deepcopy(value))

    def invalidate(self, key):
        with self._lock:
            self._items.pop(key, None)

    def invalidate_prefix(self, prefix):
        with self._lock:
            for key in list(self._items):
                if isinstance(key, tuple) and key[: len(prefix)] == prefix:
                    self._items.pop(key, None)

    def clear(self):
        with self._lock:
            self._items.clear()

    def _evict(self, now):
        expired = [key for key, (expires_at, _value) in self._items.items() if expires_at <= now]
        for key in expired:
            self._items.pop(key, None)
        if len(self._items) < self.max_items:
            return

        oldest_key = min(self._items, key=lambda key: self._items[key][0])
        self._items.pop(oldest_key, None)
