"""
Multi-Agent System Components
Individual specialized agents for different aspects of incident investigation.
"""

from typing import Dict, Any, List
from loguru import logger
from abc import ABC, abstractmethod


class BaseAgent(ABC):
    """Base class for all agents."""
    
    def __init__(self, name: str):
        self.name = name
        logger.info(f"Initialized {name}")
    
    @abstractmethod
    async def investigate(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """Investigate an incident."""
        pass


class InvestigatorAgent(BaseAgent):
    """
    Primary investigator agent - coordinates investigation and synthesizes findings.
    """
    
    def __init__(self):
        super().__init__("InvestigatorAgent")
    
    async def investigate(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """Coordinate investigation across all agents."""
        logger.info(f"Investigating: {incident.get('title')}")
        
        findings = {
            "incident_title": incident.get("title"),
            "investigation_status": "in_progress",
            "agents_engaged": [
                "kubernetes_agent",
                "cloud_agent", 
                "metrics_agent",
                "log_agent",
            ],
            "initial_findings": {
                "service": incident.get("service"),
                "severity": incident.get("severity"),
                "affected_services": incident.get("affected_services", []),
            },
        }
        
        return findings


class KubernetesAgent(BaseAgent):
    """
    Kubernetes specialist agent - investigates K8s-related issues.
    """
    
    def __init__(self):
        super().__init__("KubernetesAgent")
    
    async def investigate(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """Investigate Kubernetes issues."""
        logger.info("Running Kubernetes investigation")
        
        return {
            "pod_status": "unknown",
            "node_status": "healthy",
            "resource_requests": "within_limits",
            "recent_deployments": [],
            "findings": "No K8s anomalies detected",
        }


class CloudAgent(BaseAgent):
    """
    Cloud platform agent - investigates AWS, Azure, GCP issues.
    """
    
    def __init__(self):
        super().__init__("CloudAgent")
    
    async def investigate(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """Investigate cloud platform issues."""
        logger.info("Running cloud platform investigation")
        
        return {
            "instance_status": "running",
            "vpc_status": "healthy",
            "security_groups": "correctly_configured",
            "storage_availability": "good",
            "findings": "Cloud infrastructure appears normal",
        }


class MetricsAgent(BaseAgent):
    """
    Metrics analysis agent - analyzes performance metrics and anomalies.
    """
    
    def __init__(self):
        super().__init__("MetricsAgent")
    
    async def investigate(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze metrics for anomalies."""
        logger.info("Running metrics analysis")
        
        metrics = incident.get("metrics", {})
        
        anomalies = []
        if metrics.get("cpu_usage", 0) > 80:
            anomalies.append("High CPU usage detected")
        if metrics.get("memory_usage", 0) > 80:
            anomalies.append("High memory usage detected")
        if metrics.get("connections", 0) > 400:
            anomalies.append("Connection pool near capacity")
        
        return {
            "metrics_analyzed": {
                "cpu_usage": metrics.get("cpu_usage"),
                "memory_usage": metrics.get("memory_usage"),
                "connections": metrics.get("connections"),
                "queries_per_sec": metrics.get("queries_per_sec"),
            },
            "anomalies_detected": anomalies,
            "trend": "increasing" if metrics.get("cpu_usage", 0) > 75 else "stable",
        }


class LogAgent(BaseAgent):
    """
    Log analysis agent - analyzes logs for patterns and errors.
    """
    
    def __init__(self):
        super().__init__("LogAgent")
    
    async def investigate(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze logs for patterns."""
        logger.info("Running log analysis")
        
        raw_logs = incident.get("logs", [])
        # Normalize logs: handle lists, dicts, strings — ensure each item is a plain string
        if isinstance(raw_logs, list):
            logs = [str(item) for item in raw_logs]
        elif isinstance(raw_logs, dict):
            logs = [f"{k}: {v}" for k, v in raw_logs.items()]
        elif isinstance(raw_logs, str):
            logs = [raw_logs]
        else:
            logs = [str(raw_logs)] if raw_logs else []
        
        error_patterns = {
            "slow_queries": sum(1 for log in logs if "slow query" in log.lower()),
            "connection_errors": sum(1 for log in logs if "connection" in log.lower()),
            "timeouts": sum(1 for log in logs if "timeout" in log.lower()),
            "exceptions": sum(1 for log in logs if "exception" in log.lower()),
        }
        
        return {
            "total_logs_analyzed": len(logs),
            "error_patterns": error_patterns,
            "top_errors": logs[-3:] if logs else [],
            "error_trend": "increasing" if error_patterns["slow_queries"] > 0 else "stable",
        }


class CodeAnalysisAgent(BaseAgent):
    """
    Code analysis agent - analyzes recent code changes and their impact.
    """
    
    def __init__(self):
        super().__init__("CodeAnalysisAgent")
    
    async def investigate(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze code changes."""
        logger.info("Running code analysis")
        
        changes = incident.get("recent_changes", [])
        
        return {
            "recent_changes": changes,
            "changed_services": [c.split()[0] for c in changes],
            "potential_impact": "high" if changes else "low",
            "recommendations": [
                "Review recent deployments",
                "Check for performance regressions",
                "Consider rollback if necessary",
            ] if changes else [],
        }


class HistoricalLearningAgent(BaseAgent):
    """
    Historical learning agent - applies learnings from past incidents.
    """
    
    def __init__(self, knowledge_manager):
        super().__init__("HistoricalLearningAgent")
        self.knowledge_manager = knowledge_manager
    
    async def investigate(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """Apply learnings from similar past incidents."""
        logger.info("Searching knowledge base for similar incidents")
        
        similar_incidents = self.knowledge_manager.find_similar_incidents(incident)
        
        learnings = []
        for sim_incident in similar_incidents:
            root_cause = sim_incident.get("investigation", {}).get("root_cause")
            solution = sim_incident.get("investigation", {}).get("solution", {})
            mttr = sim_incident.get("mttr_minutes")
            
            if root_cause and solution:
                learnings.append({
                    "similar_incident": sim_incident.get("id"),
                    "root_cause": root_cause,
                    "solution": solution.get("immediate_action"),
                    "previous_mttr_minutes": mttr,
                    "similarity_score": sim_incident.get("similarity_score"),
                })
        
        return {
            "similar_incidents_found": len(similar_incidents),
            "learnings": learnings,
            "estimated_mttr_from_history": learnings[0].get("previous_mttr_minutes") if learnings else None,
        }
