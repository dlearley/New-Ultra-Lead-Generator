import redis
from datetime import datetime
from typing import Optional

from app.config import settings


class RateLimiter:
    def __init__(self):
        self.redis_client = redis.from_url(settings.redis_url, decode_responses=True)
    
    def check_rate_limit(
        self,
        key_id: str,
        rate_limit: int,
        window: int = None
    ) -> tuple[bool, int, int]:
        if window is None:
            window = settings.rate_limit_window
        
        redis_key = f"rate_limit:{key_id}"
        current_time = int(datetime.utcnow().timestamp())
        window_start = current_time - window
        
        pipe = self.redis_client.pipeline()
        pipe.zremrangebyscore(redis_key, 0, window_start)
        pipe.zadd(redis_key, {str(current_time): current_time})
        pipe.zcount(redis_key, window_start, current_time)
        pipe.expire(redis_key, window)
        
        results = pipe.execute()
        current_count = results[2]
        
        remaining = max(0, rate_limit - current_count)
        allowed = current_count <= rate_limit
        
        return allowed, remaining, rate_limit
    
    def reset_rate_limit(self, key_id: str):
        redis_key = f"rate_limit:{key_id}"
        self.redis_client.delete(redis_key)


rate_limiter = RateLimiter()
