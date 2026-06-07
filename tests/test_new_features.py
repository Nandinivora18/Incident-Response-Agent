import pytest
from fastapi.testclient import TestClient
from api.server import app

client = TestClient(app)

def test_run_remediation_step():
    response = client.post("/api/remediation/run-step", json={
        "action": "docker system prune -af --volumes",
        "step": 1
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["step"] == 1
    assert any("docker system prune" in line for line in data["logs"])

def test_knowledge_base_chat():
    response = client.post("/api/knowledge-base/chat", json={
        "message": "CoreDNS forwarding loop"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "reply" in data
    assert "citations" in data

def test_receive_webhook_alert_generic():
    response = client.post("/api/webhooks/alerts", json={
        "title": "Database Connection Leak",
        "description": "High connection pool count exceeding threshold of 400",
        "severity": "critical",
        "service": "postgres-db"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["ingested_incident"]["title"] == "Database Connection Leak"
    assert data["ingested_incident"]["severity"] == "critical"
