from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "KofKaN Store API"
    app_version: str = "1.0.0"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "sqlite:///./db/kofkan.db"
    cors_origins: str = "http://localhost:3000"
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    frontend_base_url: str = "http://localhost:3000"
    google_client_id: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
