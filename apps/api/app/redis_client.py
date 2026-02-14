import redis

from .settings import settings


def get_redis():
  return redis.Redis.from_url(settings.redis_url, decode_responses=True)
