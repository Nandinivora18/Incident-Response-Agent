import pytest
import asyncio
from agents.agents import (
    InvestigatorAgent, KubernetesAgent, CloudAgent, 
    MetricsAgent, LogAgent, CodeAnalysisAgent, HistoricalLearningAgent
)
from backend.knowledge_manager import KnowledgeManager


@pytest.mark.asyncio
async def test_metrics_agent():
    agent = MetricsAgent()
    sample_incident = {
        "metrics": {
            "cpu_usage": 90,
            "memory_usage": 60,
            "connections": 500,
        }
    }
    result = await agent.investigate(sample_incident)
    assert "High CPU usage detected" in result["anomalies_detected"]
    assert "Connection pool near capacity" in result["anomalies_detected"]
    assert result["trend"] == "increasing"


@pytest.mark.asyncio
async def test_log_agent():
    agent = LogAgent()
    sample_incident = {
        "logs": [
            "Error: Connection timeout from auth service",
            "Warning: Database queries took more than 500ms",
            "Exception: NullPointer in payment pipeline",
        ]
    }
    result = await agent.investigate(sample_incident)
    assert result["error_patterns"]["timeouts"] == 1
    assert result["error_patterns"]["exceptions"] == 1
    assert result["total_logs_analyzed"] == 3


@pytest.mark.asyncio
async def test_k8s_agent():
    agent = KubernetesAgent()
    result = await agent.investigate({})
    assert result["node_status"] == "healthy"
    assert "findings" in result


@pytest.mark.asyncio
async def test_cloud_agent():
    agent = CloudAgent()
    result = await agent.investigate({})
    assert result["instance_status"] == "running"
    assert "vpc_status" in result


@pytest.mark.asyncio
async def test_code_analysis_agent():
    agent = CodeAnalysisAgent()
    sample_incident = {
        "recent_changes": [
            "payment-service deployment v1.0.4",
            "auth-service optimization patch"
        ]
    }
    result = await agent.investigate(sample_incident)
    assert result["potential_impact"] == "high"
    assert "payment-service" in result["changed_services"]
