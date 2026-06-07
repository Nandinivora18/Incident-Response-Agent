"""
Main entry point for the Incident Response Agent.
Orchestrates the multi-agent system for incident investigation and learning.
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv
from loguru import logger
from typing import Optional
import asyncio

from backend.orchestrator import IncidentOrchestrator
from backend.knowledge_manager import KnowledgeManager
from integrations.slack_bot import SlackBot


def setup_logging():
    """Configure logging for the application."""
    log_level = os.getenv("LOG_LEVEL", "INFO")
    logger.add(
        "logs/incident_agent.log",
        rotation="500 MB",
        retention="10 days",
        level=log_level,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
    )
    logger.info("Incident Response Agent initialized")


def init_environment():
    """Initialize environment variables and configurations."""
    load_dotenv()
    
    # Create necessary directories
    Path("logs").mkdir(exist_ok=True)
    Path("data").mkdir(exist_ok=True)
    Path("knowledge_base/incidents").mkdir(exist_ok=True, parents=True)
    
    return {
        "llm_model": os.getenv("LLM_MODEL", "gpt-4-turbo-preview"),
        "database_url": os.getenv("DATABASE_URL"),
        "slack_enabled": os.getenv("ENABLE_SLACK_BOT", "true").lower() == "true",
        "auto_investigation": os.getenv("ENABLE_AUTO_INVESTIGATION", "true").lower() == "true",
    }


async def run_demo_investigation():
    """Run a demonstration investigation to show the agent in action."""
    logger.info("Starting demo investigation...")
    
    config = init_environment()
    
    # Initialize components
    knowledge_manager = KnowledgeManager()
    orchestrator = IncidentOrchestrator(knowledge_manager, config)
    
    # Create a sample incident
    sample_incident = {
        "title": "High CPU Usage on Production Database",
        "description": "Database server experiencing 95% CPU utilization",
        "severity": "critical",
        "service": "main-db",
        "timestamp": "2024-01-15T10:30:00Z",
        "affected_services": ["api-gateway", "payment-service"],
        "metrics": {
            "cpu_usage": 95,
            "memory_usage": 78,
            "connections": 450,
            "queries_per_sec": 2500,
        },
        "logs": [
            "Slow query detected",
            "Connection pool near capacity",
            "Long-running transaction detected",
        ],
        "recent_changes": ["Database schema migration", "Query optimization rollout"],
    }
    
    logger.info(f"Investigating incident: {sample_incident['title']}")
    print("\n" + "="*80)
    print("INCIDENT RESPONSE AGENT - DEMO INVESTIGATION")
    print("="*80)
    print(f"\nIncident: {sample_incident['title']}")
    print(f"Severity: {sample_incident['severity']}")
    print(f"Service: {sample_incident['service']}")
    
    # Run investigation
    investigation_result = await orchestrator.investigate(sample_incident)
    
    print("\n" + "-"*80)
    print("INVESTIGATION RESULTS")
    print("-"*80)
    print(json.dumps(investigation_result, indent=2))
    
    # Store in knowledge base
    logger.info("Storing investigation results in knowledge base...")
    knowledge_manager.store_incident(sample_incident, investigation_result)
    
    print("\n[SUCCESS] Investigation complete and stored in knowledge base!")
    print("="*80 + "\n")


async def main():
    """Main application entry point."""
    setup_logging()
    config = init_environment()
    
    logger.info("="*80)
    logger.info("INCIDENT RESPONSE AGENT - Starting")
    logger.info(f"Config: {config}")
    logger.info("="*80)
    
    try:
        # Initialize components
        knowledge_manager = KnowledgeManager()
        orchestrator = IncidentOrchestrator(knowledge_manager, config)
        
        logger.info("✅ Knowledge Manager initialized")
        logger.info("✅ Orchestrator initialized")
        
        # Initialize Slack bot if enabled
        if config["slack_enabled"]:
            slack_bot = SlackBot(orchestrator, knowledge_manager)
            logger.info("✅ Slack Bot initialized")
            
            # Start the bot
            logger.info("Starting Slack bot...")
            await slack_bot.start()
        
        # Run demo investigation
        if os.getenv("RUN_DEMO", "true").lower() == "true":
            await run_demo_investigation()
        
        # Keep the application running
        logger.info("Incident Response Agent is running. Press Ctrl+C to exit.")
        while True:
            await asyncio.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("Shutting down Incident Response Agent...")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    asyncio.run(main())
