"""Caching utilities using Redis."""
import hashlib
import json
from typing import Optional, Any
import logging

try:
    from redis import Redis
    from redis.exceptions import RedisError

    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from backend.config import settings

logger = logging.getLogger(__name__)


class CacheManager:
    """Manage caching with Redis backend."""

    def __init__(self):
        """Initialize cache manager."""
        self.redis_client: Optional[Redis] = None
        self.enabled = False

        if REDIS_AVAILABLE:
            try:
                self.redis_client = Redis.from_url(
                    settings.redis_url, decode_responses=True
                )
                # Test connection
                self.redis_client.ping()
                self.enabled = True
                logger.info("Redis cache initialized successfully")
            except (RedisError, Exception) as e:
                logger.warning(f"Redis cache not available: {e}")
                self.enabled = False
        else:
            logger.warning("Redis library not installed. Caching disabled.")

    def _generate_key(self, prefix: str, data: str) -> str:
        """Generate cache key from data."""
        hash_digest = hashlib.sha256(data.encode()).hexdigest()
        return f"{prefix}:{hash_digest[:16]}"

    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found
        """
        if not self.enabled or not self.redis_client:
            return None

        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
        except (RedisError, json.JSONDecodeError) as e:
            logger.error(f"Cache get error: {e}")

        return None

    def set(
        self, key: str, value: Any, ttl: int = 3600
    ) -> bool:
        """
        Set value in cache with TTL.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (default 1 hour)

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled or not self.redis_client:
            return False

        try:
            serialized = json.dumps(value)
            self.redis_client.setex(key, ttl, serialized)
            return True
        except (RedisError, TypeError, ValueError) as e:
            logger.error(f"Cache set error: {e}")
            return False

    def delete(self, key: str) -> bool:
        """
        Delete value from cache.

        Args:
            key: Cache key

        Returns:
            True if deleted, False otherwise
        """
        if not self.enabled or not self.redis_client:
            return False

        try:
            self.redis_client.delete(key)
            return True
        except RedisError as e:
            logger.error(f"Cache delete error: {e}")
            return False

    def get_query_cache(self, query: str, agent_type: str) -> Optional[str]:
        """
        Get cached query response.

        Args:
            query: User query
            agent_type: Type of agent (fast/deep)

        Returns:
            Cached response or None
        """
        key = self._generate_key(f"query:{agent_type}", query)
        return self.get(key)

    def set_query_cache(
        self, query: str, agent_type: str, response: str, ttl: int = 1800
    ) -> bool:
        """
        Cache query response.

        Args:
            query: User query
            agent_type: Type of agent
            response: Agent response
            ttl: Cache TTL (default 30 minutes)

        Returns:
            True if cached successfully
        """
        key = self._generate_key(f"query:{agent_type}", query)
        return self.set(key, response, ttl)

    def clear_all(self) -> bool:
        """Clear all cache entries."""
        if not self.enabled or not self.redis_client:
            return False

        try:
            self.redis_client.flushdb()
            return True
        except RedisError as e:
            logger.error(f"Cache clear error: {e}")
            return False


# Global cache instance
cache = CacheManager()
