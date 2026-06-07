"""
Slack Bot Integration
Enables the incident response agent to work within Slack.
"""

import os
import json
import asyncio
from typing import Dict, Any
from loguru import logger

try:
    from slack_bolt.async_app import AsyncApp
    from slack_bolt.context import BoltContext
    SLACK_AVAILABLE = True
except ImportError:
    SLACK_AVAILABLE = False
    logger.warning("Slack SDK not available. Install with: pip install slack-bolt")


class SlackBot:
    """Slack bot for incident investigation and collaboration."""
    
    def __init__(self, orchestrator, knowledge_manager):
        self.orchestrator = orchestrator
        self.knowledge_manager = knowledge_manager
        self.app = None
        self.ongoing_investigations = {}
        
        if SLACK_AVAILABLE:
            self._initialize_slack()
        else:
            logger.warning("SlackBot initialized but Slack SDK not available")
    
    def _initialize_slack(self):
        """Initialize Slack app."""
        bot_token = os.getenv("SLACK_BOT_TOKEN")
        signing_secret = os.getenv("SLACK_SIGNING_SECRET")
        
        if not bot_token or not signing_secret:
            logger.warning("Slack credentials not configured")
            return
        
        self.app = AsyncApp(token=bot_token, signing_secret=signing_secret)
        
        # Register handlers
        self._register_handlers()
        logger.info("Slack app initialized")
    
    def _register_handlers(self):
        """Register Slack event handlers."""
        
        @self.app.message("investigate")
        async def handle_investigate_command(message, context):
            await self._handle_investigation_request(message, context)
        
        @self.app.command("/incident")
        async def handle_incident_command(ack, body, context):
            ack()
            await self._handle_incident_slash_command(body, context)
        
        @self.app.command("/kb")
        async def handle_kb_command(ack, body, context):
            ack()
            await self._handle_kb_slash_command(body, context)
        
        logger.info("Slack event handlers registered")
    
    async def _handle_investigation_request(self, message: Dict[str, Any], context):
        """Handle investigation request from Slack."""
        channel = message["channel"]
        thread_ts = message.get("thread_ts", message["ts"])
        user = message["user"]
        text = message["text"]
        
        logger.info(f"Investigation request from {user}: {text}")
        
        # Send acknowledgment
        try:
            await self.app.client.reactions_add(
                channel=channel,
                timestamp=thread_ts,
                name="mag"
            )
        except:
            pass
        
        # Parse incident from message
        incident = self._parse_incident_from_text(text)
        
        # Send status update
        status_message = {
            "thread_ts": thread_ts,
            "text": "🔍 Starting investigation...",
        }
        
        try:
            response = await self.app.client.chat_postMessage(
                channel=channel,
                **status_message
            )
            status_ts = response["ts"]
        except Exception as e:
            logger.error(f"Failed to post message: {e}")
            return
        
        # Run investigation
        investigation_result = await self.orchestrator.investigate(incident)
        
        # Format and send results
        result_message = self._format_investigation_result(investigation_result)
        
        try:
            await self.app.client.chat_update(
                channel=channel,
                ts=status_ts,
                text=result_message,
                blocks=self._create_result_blocks(investigation_result),
            )
        except Exception as e:
            logger.error(f"Failed to update message: {e}")
    
    async def _handle_incident_slash_command(self, body: Dict[str, Any], context):
        """Handle /incident slash command."""
        channel = body["channel_id"]
        text = body["text"]
        user = body["user_id"]
        
        logger.info(f"/incident command from {user}: {text}")
        
        # Store as incident
        incident = self._parse_incident_from_text(text)
        
        message = {
            "text": f"📋 Incident recorded: {incident.get('title', 'Untitled')}",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Incident:* {incident.get('title')}\n*Severity:* {incident.get('severity')}"
                    }
                }
            ]
        }
        
        try:
            await self.app.client.chat_postMessage(channel=channel, **message)
        except Exception as e:
            logger.error(f"Failed to post incident: {e}")
    
    async def _handle_kb_slash_command(self, body: Dict[str, Any], context):
        """Handle /kb slash command to query knowledge base."""
        channel = body["channel_id"]
        text = body["text"]
        
        logger.info(f"/kb command: {text}")
        
        # Get knowledge base statistics
        stats = self.knowledge_manager.get_incident_statistics()
        
        message_text = f"""📚 *Knowledge Base Statistics*
        
Total Incidents: {stats.get('total_incidents', 0)}
Total Root Causes: {stats.get('total_root_causes', 0)}
Total Solutions: {stats.get('total_solutions', 0)}
Average MTTR: {stats.get('average_mttr_minutes', 0):.1f} minutes

Top Root Causes:
"""
        for cause in stats.get('most_common_root_causes', [])[:3]:
            message_text += f"• {cause.get('cause')}: {cause.get('frequency')} occurrences\n"
        
        message = {
            "text": message_text,
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": message_text
                    }
                }
            ]
        }
        
        try:
            await self.app.client.chat_postMessage(channel=channel, **message)
        except Exception as e:
            logger.error(f"Failed to post KB stats: {e}")
    
    async def start(self):
        """Start the Slack bot."""
        if not self.app:
            logger.warning("Slack bot not initialized")
            return
        
        logger.info("Starting Slack bot...")
        try:
            handler = self.app.async_handler
            logger.info("Slack bot running (requires handler setup in your server)")
        except Exception as e:
            logger.error(f"Failed to start Slack bot: {e}")
    
    @staticmethod
    def _parse_incident_from_text(text: str) -> Dict[str, Any]:
        """Parse incident details from text."""
        # Simple parsing - can be enhanced with NLP
        return {
            "title": text[:100] if text else "Untitled incident",
            "description": text,
            "severity": "high" if any(word in text.lower() for word in ["critical", "down", "error"]) else "medium",
            "service": "unknown",
            "tags": ["slack-reported"],
        }
    
    @staticmethod
    def _format_investigation_result(result: Dict[str, Any]) -> str:
        """Format investigation result for Slack."""
        rc = result.get("root_cause", "Unknown")
        confidence = result.get("root_cause_confidence", 0)
        solution = result.get("solution", {}).get("immediate_action", "No solution available")
        
        return f"""✅ Investigation Complete

🎯 Root Cause: {rc}
📊 Confidence: {confidence:.0%}

💡 Recommended Action:
{solution}

⏱️ Investigation Time: {result.get('duration_minutes', 0):.1f} minutes
"""
    
    @staticmethod
    def _create_result_blocks(result: Dict[str, Any]) -> list:
        """Create Slack message blocks for results."""
        return [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "📋 Investigation Results"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Root Cause:*\n{result.get('root_cause', 'Unknown')}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Confidence:*\n{result.get('root_cause_confidence', 0):.0%}"
                    }
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Immediate Action:*\n{result.get('solution', {}).get('immediate_action', 'No solution available')}"
                }
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"Investigation completed in {result.get('duration_minutes', 0):.1f} minutes"
                    }
                ]
            }
        ]
