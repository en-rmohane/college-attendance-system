import time
import functools
import threading
from typing import Any, Callable, Optional, Dict, Tuple

class FastRAMCache:
    """
    Ultra-fast in-memory Thread-Safe TTL Micro-Cache.
    Eliminates database overload during traffic surges by serving 
    frequently accessed read-data directly from RAM in < 0.1ms.
    """
    def __init__(self, max_entries: int = 5000):
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self._lock = threading.RLock()
        self._max_entries = max_entries
        self._last_prune = time.time()

    def get(self, key: str, default: Any = None) -> Any:
        now = time.time()
        with self._lock:
            if key in self._cache:
                val, expiry = self._cache[key]
                if expiry > now:
                    return val
                else:
                    del self._cache[key]
        return default

    def set(self, key: str, val: Any, ttl_seconds: int = 30) -> None:
        now = time.time()
        expiry = now + ttl_seconds
        with self._lock:
            # Periodic prune if cache grows
            if len(self._cache) >= self._max_entries or (now - self._last_prune > 300):
                self._prune(now)
            self._cache[key] = (val, expiry)

    def delete(self, key: str) -> None:
        with self._lock:
            self._cache.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> int:
        """Invalidates all cached keys starting with the given prefix."""
        with self._lock:
            keys_to_del = [k for k in self._cache if k.startswith(prefix)]
            for k in keys_to_del:
                del self._cache[k]
            return len(keys_to_del)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def _prune(self, now: float) -> None:
        self._last_prune = now
        expired_keys = [k for k, (_, exp) in self._cache.items() if exp <= now]
        for k in expired_keys:
            del self._cache[k]
        # If still over max_entries, remove oldest entries
        if len(self._cache) > self._max_entries:
            overflow = len(self._cache) - self._max_entries
            keys_to_remove = list(self._cache.keys())[:overflow]
            for k in keys_to_remove:
                del self._cache[k]

    def cached(self, ttl_seconds: int = 30, key_prefix: str = ""):
        """
        Decorator to cache function results in RAM for `ttl_seconds`.
        """
        def decorator(func: Callable):
            prefix = key_prefix or f"{func.__module__}.{func.__name__}"
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                # Build cache key based on args
                arg_strs = [str(a) for a in args]
                kwarg_strs = [f"{k}={v}" for k, v in sorted(kwargs.items())]
                call_sig = ":".join(arg_strs + kwarg_strs)
                cache_key = f"{prefix}:{call_sig}" if call_sig else prefix

                cached_val = self.get(cache_key)
                if cached_val is not None:
                    return cached_val

                result = func(*args, **kwargs)
                if result is not None:
                    self.set(cache_key, result, ttl_seconds=ttl_seconds)
                return result
            return wrapper
        return decorator

# Global singleton cache instance
ram_cache = FastRAMCache()
