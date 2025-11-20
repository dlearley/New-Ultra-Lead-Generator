from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://user:password@localhost:5432/webhooks_db"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "your-secret-key-change-in-production"
    api_version: str = "v1"
    environment: str = "development"
    log_level: str = "INFO"
    
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"
    
    webhook_max_retries: int = 5
    webhook_initial_retry_delay: int = 1
    webhook_retry_multiplier: int = 2
    webhook_timeout: int = 30
    
    default_rate_limit: int = 1000
    rate_limit_window: int = 3600
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
