from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    intentcore_email: str
    intentcore_password: str
    intentcore_workspace_url: str
    api_key: str

    pool_size: int = 2
    session_max_age_sec: int = 600  # 10 minutes
    chrome_headless: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
