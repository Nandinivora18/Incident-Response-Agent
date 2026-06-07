"""
Configuration Management
Centralized configuration for the Incident Response Agent
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings from environment variables."""
    
    # API Configuration
    llm_model: str = "gpt-4-turbo-preview"
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    
    # Database Configuration
    database_url: str = "postgresql://localhost:5432/incident_response"
    mongodb_uri: str = "mongodb://localhost:27017/incident_db"
    redis_url: str = "redis://localhost:6379/0"
    
    # Slack Configuration
    slack_bot_token: Optional[str] = None
    slack_signing_secret: Optional[str] = None
    slack_app_version: str = "1.0.0"
    
    # Microsoft Teams Configuration
    teams_app_id: Optional[str] = None
    teams_app_password: Optional[str] = None
    
    # AWS Configuration
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_default_region: str = "us-east-1"
    
    # Azure Configuration
    azure_subscription_id: Optional[str] = None
    azure_client_id: Optional[str] = None
    azure_client_secret: Optional[str] = None
    
    # Google Cloud Configuration
    google_application_credentials: Optional[str] = None
    
    # Monitoring Tools
    datadog_api_key: Optional[str] = None
    new_relic_api_key: Optional[str] = None
    elastic_host: str = "localhost:9200"
    
    # GitHub Integration
    github_token: Optional[str] = None
    github_org: Optional[str] = None
    
    # Knowledge Base
    incident_memory_db: str = "memory.json"
    kb_similarity_threshold: float = 0.7
    max_historical_incidents: int = 1000
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    # API Server
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = False
    
    # Agent Configuration
    investigation_timeout: int = 300
    max_concurrent_investigations: int = 5
    enable_auto_investigation: bool = True
    
    # Feature Flags
    enable_slack_bot: bool = True
    enable_teams_bot: bool = False
    enable_auto_incidents: bool = True
    enable_learning: bool = True
    run_demo: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False


def get_settings() -> Settings:
    """Get application settings."""
    return Settings()
