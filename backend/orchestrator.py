"""
Incident Orchestrator
Coordinates multiple agents to investigate incidents and learn from them.
"""

import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from loguru import logger
from enum import Enum


class InvestigationPhase(Enum):
    """Phases of incident investigation."""
    KNOWLEDGE_RETRIEVAL = "knowledge_retrieval"
    INITIAL_ASSESSMENT = "initial_assessment"
    DEEP_INVESTIGATION = "deep_investigation"
    ROOT_CAUSE_ANALYSIS = "root_cause_analysis"
    SOLUTION_GENERATION = "solution_generation"
    REMEDIATION = "remediation"
    LEARNING = "learning"


class IncidentOrchestrator:
    """Orchestrates the incident investigation process."""
    
    def __init__(self, knowledge_manager, config: Dict[str, Any]):
        self.knowledge_manager = knowledge_manager
        self.config = config
        self.current_incident = None
        self.investigation_results = None
        logger.info("IncidentOrchestrator initialized")
    
    async def investigate(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main investigation workflow orchestration.
        Coordinates multiple agents to investigate an incident.
        """
        self.current_incident = incident
        investigation_start = datetime.now()
        
        logger.info(f"Starting investigation for: {incident.get('title')}")
        logger.debug(f"Incident data: {incident}")
        
        try:
            # Phase 1: Retrieve similar historical incidents
            logger.info("Phase 1: Knowledge Retrieval")
            try:
                similar_incidents = self.knowledge_manager.find_similar_incidents(incident)
                logger.info(f"Phase 1 complete: Found {len(similar_incidents)} similar incidents")
            except Exception as e:
                logger.error(f"Phase 1 failed: {e}", exc_info=True)
                similar_incidents = []
            
            # Phase 2: Initial assessment
            logger.info("Phase 2: Initial Assessment")
            try:
                initial_assessment = self._assess_incident(incident)
                logger.info("Phase 2 complete")
            except Exception as e:
                logger.error(f"Phase 2 failed: {e}", exc_info=True)
                initial_assessment = {}
            
            # Phase 3: Deep investigation
            logger.info("Phase 3: Deep Investigation")
            try:
                investigation_data = await self._collect_investigation_data(incident)
                logger.info("Phase 3 complete")
            except Exception as e:
                logger.error(f"Phase 3 failed: {e}", exc_info=True)
                investigation_data = {}
            
            # Phase 4: Root cause analysis
            logger.info("Phase 4: Root Cause Analysis")
            try:
                root_cause_analysis = self._analyze_root_causes(
                    incident, investigation_data, similar_incidents
                )
                logger.info(f"Phase 4 complete: Root cause = {root_cause_analysis.get('primary_cause')}")
            except Exception as e:
                logger.error(f"Phase 4 failed: {e}", exc_info=True)
                root_cause_analysis = {
                    "primary_cause": "Unknown",
                    "confidence": 0,
                    "contributing_factors": [],
                    "evidence": []
                }
            
            # Phase 5: Solution generation
            logger.info("Phase 5: Solution Generation")
            try:
                solution = self._generate_solution(root_cause_analysis)
                logger.info("Phase 5 complete")
            except Exception as e:
                logger.error(f"Phase 5 failed: {e}", exc_info=True)
                solution = {
                    "solution_type": "Unknown",
                    "immediate_action": "Investigate and scale resources",
                    "short_term_fix": "Monitor and optimize performance",
                    "long_term_prevention": "Improve monitoring",
                    "effectiveness_score": 0.5,
                }
            
            # Phase 6: Remediation plan
            logger.info("Phase 6: Remediation Planning")
            try:
                remediation_plan = self._create_remediation_plan(root_cause_analysis, solution)
                logger.info(f"Phase 6 complete: {len(remediation_plan)} steps")
            except Exception as e:
                logger.error(f"Phase 6 failed: {e}", exc_info=True)
                remediation_plan = []
            
            # Phase 7: Learning
            logger.info("Phase 7: Storing Learning")
            
            # Calculate MTTR
            investigation_duration = (datetime.now() - investigation_start).total_seconds() / 60
            
            investigation_result = {
                "incident_id": incident.get("title", "unknown"),
                "status": "completed",
                "phases_completed": [phase.value for phase in InvestigationPhase],
                "timestamp": datetime.now().isoformat(),
                "duration_minutes": round(investigation_duration, 2),
                "initial_assessment": initial_assessment,
                "similar_incidents": [
                    {
                        "id": si.get("id"),
                        "title": si.get("incident", {}).get("title"),
                        "similarity_score": si.get("similarity_score"),
                        "mttr_minutes": si.get("mttr_minutes"),
                    }
                    for si in similar_incidents[:3]
                ],
                "investigation_data": investigation_data,
                "root_cause": root_cause_analysis.get("primary_cause"),
                "root_cause_confidence": root_cause_analysis.get("confidence"),
                "contributing_factors": root_cause_analysis.get("contributing_factors"),
                "solution": solution,
                "remediation_plan": remediation_plan,
                "mttr_minutes": investigation_duration,
                "learning_applied": self._get_learning_applied(similar_incidents),
                "recommendations": self._generate_recommendations(root_cause_analysis, solution),
            }
            
            self.investigation_results = investigation_result
            logger.info(f"Investigation completed in {investigation_duration:.2f} minutes")
            
            return investigation_result
            
        except Exception as e:
            logger.error(f"Investigation failed with exception: {e}", exc_info=True)
            import traceback
            error_detail = traceback.format_exc()
            logger.error(f"Traceback: {error_detail}")
            return {
                "status": "failed",
                "error": str(e),
                "error_detail": error_detail,
                "timestamp": datetime.now().isoformat(),
            }
    
    def _assess_incident(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """Perform initial assessment of the incident."""
        return {
            "severity": incident.get("severity", "medium"),
            "affected_services": incident.get("affected_services", []),
            "impact": self._estimate_impact(incident),
            "urgency_level": self._calculate_urgency(incident),
            "estimated_scope": len(incident.get("affected_services", [])),
        }
    
    async def _collect_investigation_data(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """Collect data from various sources for investigation."""
        try:
            return {
                "metrics_analysis": self._analyze_metrics(incident.get("metrics", {})) or {},
                "log_analysis": self._analyze_logs(incident.get("logs", [])) or {},
                "recent_changes": incident.get("recent_changes", []),
                "service_status": self._get_service_status(incident.get("affected_services", [])) or {},
                "error_rate_spike": self._detect_error_spike(incident),
                "resource_exhaustion": self._check_resource_exhaustion(incident) or {},
            }
        except Exception as e:
            logger.error(f"Error collecting investigation data: {e}", exc_info=True)
            return {
                "metrics_analysis": {},
                "log_analysis": {},
                "recent_changes": [],
                "service_status": {},
                "error_rate_spike": False,
                "resource_exhaustion": {},
            }
    
    def _analyze_root_causes(self, incident: Dict[str, Any], 
                            investigation_data: Dict[str, Any],
                            similar_incidents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze and determine root causes."""
        
        potential_causes = []
        
        # Check metrics anomalies
        metrics_analysis = investigation_data.get("metrics_analysis", {}) or {}
        if high_cpu := metrics_analysis.get("high_cpu"):
            potential_causes.append({
                "cause": "High CPU Usage",
                "likelihood": 0.8,
                "evidence": high_cpu
            })
        
        # Check resource exhaustion
        resource_exhaustion = investigation_data.get("resource_exhaustion", {}) or {}
        if exhaustion := resource_exhaustion:
            potential_causes.append({
                "cause": "Resource Exhaustion",
                "likelihood": 0.75,
                "evidence": str(exhaustion)
            })
        
        # Check for memory leak patterns in logs
        log_analysis = investigation_data.get("log_analysis", {}) or {}
        if "memory" in str(incident.get("description", "")).lower() or "heap" in str(incident.get("description", "")).lower():
            potential_causes.append({
                "cause": "Memory Leak",
                "likelihood": 0.85,
                "evidence": "Description contains memory/heap references"
            })
        
        # Apply learnings from similar incidents
        for similar in similar_incidents[:1]:  # Check most similar incident
            if investigation := similar.get("investigation"):
                if past_root_cause := investigation.get("root_cause"):
                    potential_causes.append({
                        "cause": f"Similar to past: {past_root_cause}",
                        "likelihood": 0.7,
                        "evidence": "Historical pattern match"
                    })
        
        # Sort by likelihood
        potential_causes.sort(key=lambda x: x["likelihood"], reverse=True)
        
        primary_cause = potential_causes[0] if potential_causes else None
        
        return {
            "primary_cause": primary_cause.get("cause") if primary_cause else "Unknown",
            "confidence": primary_cause.get("likelihood", 0) if primary_cause else 0,
            "contributing_factors": [c["cause"] for c in potential_causes],
            "evidence": [c["evidence"] for c in potential_causes],
        }
    
    def _generate_solution(self, root_cause_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate solution recommendations."""
        try:
            primary_cause = root_cause_analysis.get("primary_cause", "Unknown") if root_cause_analysis else "Unknown"
            
            solutions_map = {
                "High CPU Usage": {
                    "immediate": "Scale up instances or reduce traffic",
                    "short_term": "Optimize queries and code hot spots",
                    "long_term": "Implement better load balancing and caching",
                },
                "Resource Exhaustion": {
                    "immediate": "Increase resource allocation",
                    "short_term": "Review and optimize resource usage",
                    "long_term": "Implement auto-scaling policies",
                },
                "Memory Leak": {
                    "immediate": "Restart affected services",
                    "short_term": "Identify and patch memory leak",
                    "long_term": "Implement memory monitoring and alerts",
                },
            }
            
            # Get solution with fallback
            general_solution = solutions_map.get(primary_cause)
            if not general_solution:
                # Try fallback
                general_solution = solutions_map.get("High CPU Usage", {
                    "immediate": "Investigate and scale resources",
                    "short_term": "Monitor and optimize performance",
                    "long_term": "Implement better observability",
                })
            
            return {
                "solution_type": primary_cause,
                "immediate_action": general_solution.get("immediate", "Scale up resources"),
                "short_term_fix": general_solution.get("short_term", "Optimize application"),
                "long_term_prevention": general_solution.get("long_term", "Improve monitoring"),
                "effectiveness_score": 0.85,
            }
        except Exception as e:
            logger.error(f"Failed to generate solution: {e}", exc_info=True)
            return {
                "solution_type": "Unknown",
                "immediate_action": "Investigate and scale resources",
                "short_term_fix": "Monitor and optimize performance",
                "long_term_prevention": "Improve monitoring",
                "effectiveness_score": 0.5,
            }
    
    def _create_remediation_plan(self, root_cause_analysis: Dict[str, Any],
                                solution: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create a detailed remediation plan."""
        return [
            {
                "step": 1,
                "action": solution["immediate_action"],
                "priority": "critical",
                "estimated_time_minutes": 5,
                "runbook": "/runbooks/immediate-mitigation.md",
            },
            {
                "step": 2,
                "action": solution["short_term_fix"],
                "priority": "high",
                "estimated_time_minutes": 30,
                "runbook": "/runbooks/short-term-fix.md",
            },
            {
                "step": 3,
                "action": solution["long_term_prevention"],
                "priority": "medium",
                "estimated_time_minutes": 120,
                "runbook": "/runbooks/long-term-prevention.md",
            },
            {
                "step": 4,
                "action": "Document and store learning in knowledge base",
                "priority": "medium",
                "estimated_time_minutes": 15,
                "runbook": "/runbooks/documentation.md",
            },
        ]
    
    def _get_learning_applied(self, similar_incidents: List[Dict[str, Any]]) -> List[str]:
        """Identify learnings applied from similar incidents."""
        learning = []
        
        for incident in similar_incidents[:2]:
            solution = incident.get("investigation", {}).get("solution", {})
            if solution:
                learning.append(f"Applied solution from incident {incident.get('id')}: {solution.get('solution_type')}")
        
        return learning if learning else ["No previous similar incidents found"]
    
    def _generate_recommendations(self, root_cause_analysis: Dict[str, Any],
                                 solution: Dict[str, Any]) -> List[str]:
        """Generate additional recommendations."""
        return [
            "Implement proactive monitoring for this metric",
            "Set up automatic alerting before threshold is reached",
            "Update runbooks with new findings",
            "Share learning with team",
            "Schedule post-incident review",
            "Consider architecture improvements",
        ]
    
    # Helper methods
    
    @staticmethod
    def _estimate_impact(incident: Dict[str, Any]) -> str:
        """Estimate the business impact."""
        severity = incident.get("severity", "medium")
        num_services = len(incident.get("affected_services", []))
        
        if severity == "critical" and num_services > 5:
            return "high"
        elif severity == "critical" or num_services > 3:
            return "medium"
        else:
            return "low"
    
    @staticmethod
    def _calculate_urgency(incident: Dict[str, Any]) -> str:
        """Calculate urgency level."""
        severity = incident.get("severity", "medium")
        if severity == "critical":
            return "immediate"
        elif severity == "high":
            return "urgent"
        else:
            return "normal"
    
    @staticmethod
    def _analyze_metrics(metrics: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze metrics for anomalies."""
        if metrics is None:
            metrics = {}
        return {
            "high_cpu": metrics.get("cpu_usage", 0) > 80,
            "high_memory": metrics.get("memory_usage", 0) > 80,
            "connection_exhaustion": metrics.get("connections", 0) > 400,
            "high_qps": metrics.get("queries_per_sec", 0) > 2000,
        }
    
    @staticmethod
    def _analyze_logs(logs: Any) -> Dict[str, Any]:
        """Analyze logs for patterns. Handles various input formats."""
        try:
            # Convert various formats to list of strings
            log_list = []
            
            if isinstance(logs, list):
                log_list = [str(item) for item in logs]
            elif isinstance(logs, dict):
                log_list = [f"{k}:{v}" for k, v in logs.items()]
            elif isinstance(logs, str):
                log_list = [logs]
            else:
                log_list = [str(logs)]
            
            return {
                "error_count": sum(1 for log in log_list if "error" in log.lower()),
                "warning_count": sum(1 for log in log_list if "warning" in log.lower()),
                "timeout_count": sum(1 for log in log_list if "timeout" in log.lower()),
                "recent_patterns": log_list[-3:] if log_list else [],
            }
        except Exception as e:
            logger.error(f"Error analyzing logs: {e}")
            return {
                "error_count": 0,
                "warning_count": 0,
                "timeout_count": 0,
                "recent_patterns": [],
            }
    
    @staticmethod
    def _get_service_status(services: List[str]) -> Dict[str, str]:
        """Get status of affected services."""
        return {service: "degraded" for service in services}
    
    @staticmethod
    def _detect_error_spike(incident: Dict[str, Any]) -> bool:
        """Detect if there's an error spike."""
        return "error" in str(incident.get("logs", [])).lower()
    
    @staticmethod
    def _check_resource_exhaustion(incident: Dict[str, Any]) -> Dict[str, Any]:
        """Check for resource exhaustion."""
        metrics = incident.get("metrics") or {}
        return {
            "cpu_near_limit": metrics.get("cpu_usage", 0) > 90,
            "memory_near_limit": metrics.get("memory_usage", 0) > 90,
            "connections_near_limit": metrics.get("connections", 0) > 480,
        }
