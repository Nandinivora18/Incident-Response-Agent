import pytest
import shutil
from pathlib import Path
from backend.knowledge_manager import KnowledgeManager
from backend.orchestrator import IncidentOrchestrator


@pytest.fixture
def temp_knowledge_manager():
    # Setup temporary directory for test knowledge base
    test_kb_dir = Path("tests/temp_kb")
    test_kb_dir.mkdir(exist_ok=True, parents=True)
    
    km = KnowledgeManager(kb_dir=str(test_kb_dir))
    
    yield km
    
    # Cleanup after test
    shutil.rmtree(test_kb_dir, ignore_errors=True)


@pytest.mark.asyncio
async def test_orchestrator_new_vs_similar_mttr(temp_knowledge_manager):
    config = {
        "llm_model": "gpt-4-turbo-preview",
        "database_url": None,
        "slack_enabled": False,
        "auto_investigation": True,
    }
    
    orchestrator = IncidentOrchestrator(temp_knowledge_manager, config)
    
    # Define a new incident
    new_incident = {
        "title": "OOM Exception in payment-service container",
        "description": "Container terminated with Exit Code 137, showing heap memory exhaustion",
        "severity": "critical",
        "service": "payment-service",
        "metrics": {
            "cpu_usage": 45,
            "memory_usage": 98,
            "connections": 50,
        },
        "logs": [
            "java.lang.OutOfMemoryError: Java heap space",
            "Warning: Heap utilization at 98%"
        ],
        "recent_changes": []
    }
    
    # 1. First run (No similar incidents in KB)
    result_1 = await orchestrator.investigate(new_incident)
    assert result_1["status"] == "completed"
    assert result_1["root_cause"] == "Memory Leak"
    # MTTR for completely new incident should be baseline (35 minutes)
    assert result_1["mttr_minutes"] == 35.0
    assert "No previous similar incidents" in result_1["learning_applied"][0]
    
    # Save first incident to KB
    temp_knowledge_manager.store_incident(new_incident, result_1)
    
    # 2. Second run (Identical incident)
    result_2 = await orchestrator.investigate(new_incident)
    assert result_2["status"] == "completed"
    assert result_2["root_cause"] == "Memory Leak"
    # Reusing historical knowledge should reduce MTTR significantly
    assert result_2["mttr_minutes"] < 10.0
    assert "Applied solution from incident" in result_2["learning_applied"][0]
    
    # Check that similar incidents returned correct root cause
    assert len(result_2["similar_incidents"]) == 1
    assert result_2["similar_incidents"][0]["root_cause"] == "Memory Leak"
    assert result_2["similar_incidents"][0]["similarity_score"] > 0.9
