"""
Knowledge Base Management System
Stores and retrieves historical incidents, root causes, and solutions
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
from loguru import logger
from difflib import SequenceMatcher
import sqlite3


class KnowledgeManager:
    """Manages the incident knowledge base for learning and retrieval."""
    
    def __init__(self, kb_dir: str = "knowledge_base"):
        self.kb_dir = Path(kb_dir)
        self.kb_dir.mkdir(exist_ok=True)
        
        # Initialize storage
        self.incidents_file = self.kb_dir / "incidents.json"
        self.root_causes_file = self.kb_dir / "root_causes.json"
        self.solutions_file = self.kb_dir / "solutions.json"
        self.patterns_file = self.kb_dir / "patterns.json"
        
        self._ensure_files_exist()
        logger.info(f"Knowledge Manager initialized at {self.kb_dir}")
    
    def _ensure_files_exist(self):
        """Ensure all KB files exist."""
        for file_path in [self.incidents_file, self.root_causes_file, 
                         self.solutions_file, self.patterns_file]:
            if not file_path.exists():
                with open(file_path, 'w') as f:
                    json.dump([], f)
    
    def store_incident(self, incident: Dict[str, Any], investigation: Dict[str, Any]):
        """Store a new incident and its investigation results."""
        try:
            # Load existing incidents
            incidents = self._load_json(self.incidents_file)
            
            # Add new incident with metadata
            new_incident = {
                "id": f"INC-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "timestamp": datetime.now().isoformat(),
                "incident": incident,
                "investigation": investigation,
                "tags": self._extract_tags(incident),
                "severity": incident.get("severity", "unknown"),
                "mttr_minutes": investigation.get("mttr_minutes", None),
            }
            
            incidents.append(new_incident)
            self._save_json(self.incidents_file, incidents)
            
            # Store root cause
            if investigation.get("root_cause"):
                self._store_root_cause(
                    incident.get("title", "Unknown"),
                    investigation["root_cause"],
                    new_incident["id"]
                )
            
            # Store solution
            if investigation.get("solution"):
                self._store_solution(
                    investigation.get("root_cause", "Unknown"),
                    investigation["solution"],
                    investigation.get("effectiveness_score", 0.8),
                    new_incident["id"]
                )
            
            logger.info(f"Incident {new_incident['id']} stored successfully")
            return new_incident["id"]
            
        except Exception as e:
            logger.error(f"Failed to store incident: {e}")
            raise
    
    def find_similar_incidents(self, incident: Dict[str, Any], 
                               similarity_threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Find similar past incidents using keyword matching."""
        try:
            incidents = self._load_json(self.incidents_file)
            
            current_title = incident.get("title", "").lower()
            current_service = incident.get("service", "").lower()
            current_tags = set(self._extract_tags(incident))
            
            similar = []
            
            for past_incident in incidents:
                past_title = past_incident.get("incident", {}).get("title", "").lower()
                past_service = past_incident.get("incident", {}).get("service", "").lower()
                past_tags = set(past_incident.get("tags", []))
                
                # Calculate similarity scores
                title_similarity = self._string_similarity(current_title, past_title)
                service_match = 1.0 if current_service == past_service else 0.3
                tag_overlap = len(current_tags & past_tags) / max(len(current_tags | past_tags), 1)
                
                # Weighted average
                overall_similarity = (
                    title_similarity * 0.4 +
                    service_match * 0.3 +
                    tag_overlap * 0.3
                )
                
                if overall_similarity >= similarity_threshold:
                    similar.append({
                        **past_incident,
                        "similarity_score": overall_similarity
                    })
            
            # Sort by similarity score
            similar.sort(key=lambda x: x["similarity_score"], reverse=True)
            logger.info(f"Found {len(similar)} similar incidents")
            return similar[:5]  # Return top 5
            
        except Exception as e:
            logger.error(f"Failed to find similar incidents: {e}")
            return []
    
    def get_root_cause_patterns(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get the most common root cause patterns."""
        try:
            root_causes = self._load_json(self.root_causes_file)
            
            # Sort by frequency
            root_causes.sort(key=lambda x: x.get("frequency", 0), reverse=True)
            
            logger.info(f"Retrieved {len(root_causes[:limit])} root cause patterns")
            return root_causes[:limit]
            
        except Exception as e:
            logger.error(f"Failed to get root cause patterns: {e}")
            return []
    
    def get_solutions_for_root_cause(self, root_cause: str) -> List[Dict[str, Any]]:
        """Get all solutions for a specific root cause."""
        try:
            solutions = self._load_json(self.solutions_file)
            
            matching = [s for s in solutions if s.get("root_cause", "").lower() == root_cause.lower()]
            
            # Sort by effectiveness score
            matching.sort(key=lambda x: x.get("effectiveness_score", 0), reverse=True)
            
            logger.info(f"Found {len(matching)} solutions for root cause: {root_cause}")
            return matching
            
        except Exception as e:
            logger.error(f"Failed to get solutions: {e}")
            return []
    
    def get_incident_statistics(self) -> Dict[str, Any]:
        """Get statistics about the knowledge base."""
        try:
            incidents = self._load_json(self.incidents_file)
            root_causes = self._load_json(self.root_causes_file)
            solutions = self._load_json(self.solutions_file)
            
            # Calculate statistics
            severities = {}
            services = {}
            total_mttr = 0
            count_with_mttr = 0
            
            for incident in incidents:
                severity = incident.get("severity", "unknown")
                severities[severity] = severities.get(severity, 0) + 1
                
                service = incident.get("incident", {}).get("service", "unknown")
                services[service] = services.get(service, 0) + 1
                
                mttr = incident.get("mttr_minutes")
                if mttr:
                    total_mttr += mttr
                    count_with_mttr += 1
            
            avg_mttr = total_mttr / count_with_mttr if count_with_mttr > 0 else 0
            
            stats = {
                "total_incidents": len(incidents),
                "total_root_causes": len(root_causes),
                "total_solutions": len(solutions),
                "average_mttr_minutes": round(avg_mttr, 2),
                "incidents_by_severity": severities,
                "incidents_by_service": services,
                "most_common_root_causes": [
                    {"cause": rc.get("cause"), "frequency": rc.get("frequency")}
                    for rc in root_causes[:5]
                ],
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get statistics: {e}")
            return {}
    
    def _store_root_cause(self, incident_name: str, root_cause: str, incident_id: str):
        """Store a root cause in the knowledge base."""
        try:
            root_causes = self._load_json(self.root_causes_file)
            
            # Check if root cause already exists
            existing = next((rc for rc in root_causes if rc.get("cause", "").lower() == root_cause.lower()), None)
            
            if existing:
                existing["frequency"] = existing.get("frequency", 1) + 1
                existing["last_occurred"] = datetime.now().isoformat()
                existing["incident_ids"].append(incident_id)
            else:
                root_causes.append({
                    "cause": root_cause,
                    "frequency": 1,
                    "first_occurred": datetime.now().isoformat(),
                    "last_occurred": datetime.now().isoformat(),
                    "incident_ids": [incident_id],
                })
            
            self._save_json(self.root_causes_file, root_causes)
            
        except Exception as e:
            logger.error(f"Failed to store root cause: {e}")
    
    def _store_solution(self, root_cause: str, solution: str, 
                       effectiveness_score: float, incident_id: str):
        """Store a solution in the knowledge base."""
        try:
            solutions = self._load_json(self.solutions_file)
            
            solutions.append({
                "root_cause": root_cause,
                "solution": solution,
                "effectiveness_score": effectiveness_score,
                "incident_id": incident_id,
                "created_at": datetime.now().isoformat(),
            })
            
            self._save_json(self.solutions_file, solutions)
            
        except Exception as e:
            logger.error(f"Failed to store solution: {e}")
    
    def _extract_tags(self, incident: Dict[str, Any]) -> List[str]:
        """Extract tags from incident."""
        tags = []
        
        # Service tag
        if service := incident.get("service"):
            tags.append(f"service:{service}")
        
        # Severity tag
        if severity := incident.get("severity"):
            tags.append(f"severity:{severity}")
        
        # Custom tags
        if custom_tags := incident.get("tags"):
            tags.extend(custom_tags)
        
        return tags
    
    @staticmethod
    def _string_similarity(a: str, b: str) -> float:
        """Calculate similarity between two strings."""
        return SequenceMatcher(None, a, b).ratio()
    
    @staticmethod
    def _load_json(file_path: Path) -> List[Any]:
        """Load JSON file safely."""
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    
    @staticmethod
    def _save_json(file_path: Path, data: Any):
        """Save JSON file safely."""
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
