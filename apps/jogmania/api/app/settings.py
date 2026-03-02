from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

  app_name: str = "Jogmania API"

  postgres_host: str = "db"
  postgres_port: int = 5432
  postgres_user: str = "jogmania"
  postgres_password: str = "jogmania"
  postgres_db: str = "jogmania"

  redis_url: str = "redis://redis:6379/0"

  minio_endpoint: str = "minio:9000"
  minio_access_key: str = "jogmania"
  minio_secret_key: str = "jogmania"
  minio_secure: bool = False
  s3_bucket: str = "jogmania-exports"

  jwt_secret: str = "changeme"
  jwt_algorithm: str = "HS256"
  access_token_expire_minutes: int = 60 * 24

  llm_base_url: str = "http://localhost:8080/v1"
  llm_api_key: str = ""
  llm_model: str = "gpt-4o-mini"

  ai_cache_ttl_seconds: int = 86400
  cors_allow_origins: str = "*"

  @property
  def database_url(self) -> str:
    return (
      f"postgresql+psycopg://{self.postgres_user}:"
      f"{self.postgres_password}@{self.postgres_host}:"
      f"{self.postgres_port}/{self.postgres_db}"
    )


settings = Settings()
