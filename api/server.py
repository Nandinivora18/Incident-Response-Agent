"""
API Server for Incident Response Agent
FastAPI endpoints for frontend communication
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Union
import json
import os
from datetime import datetime
from pathlib import Path
import traceback
import asyncio
import time

from backend.orchestrator import IncidentOrchestrator
from backend.knowledge_manager import KnowledgeManager


# Pydantic models
class IncidentRequest(BaseModel):
    title: str
    description: str
    severity: str
    service: str
    affected_services: List[str] = []
    metrics: Optional[Dict[str, Any]] = None
    logs: Optional[Union[List[str], Dict[str, Any], str]] = None  # Accept flexible log formats


class IncidentResponse(BaseModel):
    status: str
    root_cause: str
    confidence: float
    solution: Dict[str, str]
    remediation_plan: List[Dict[str, Any]]


# Initialize FastAPI app
app = FastAPI(
    title="Incident Response Agent API",
    description="AI-powered incident investigation and learning system",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request timeout middleware
REQUEST_TIMEOUT = 120  # 2 minutes for investigations

@app.middleware("http")
async def timeout_middleware(request: Request, call_next):
    """Add request timeout protection"""
    try:
        start_time = time.time()
        # Exclude health checks from timeout
        if request.url.path == "/api/health":
            return await call_next(request)
        
        # For investigation endpoint, use longer timeout
        timeout = 120 if "/investigate" in request.url.path else 30
        
        response = await asyncio.wait_for(call_next(request), timeout=timeout)
        
        elapsed = time.time() - start_time
        response.headers["X-Process-Time"] = str(elapsed)
        return response
    except asyncio.TimeoutError:
        return JSONResponse(
            status_code=504,
            content={
                "detail": "Request timeout - investigation took too long",
                "error_detail": "The investigation process exceeded the time limit"
            }
        )
    except Exception as e:
        raise

# Initialize managers
knowledge_manager = KnowledgeManager()
orchestrator = IncidentOrchestrator(knowledge_manager, {
    "llm_model": "gpt-4-turbo-preview",
    "database_url": None,
    "slack_enabled": False,
    "auto_investigation": True,
})


# API Endpoints

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Incident Response Agent"
    }


@app.post("/api/investigate")
async def investigate_incident(incident: IncidentRequest):
    """Investigate an incident"""
    try:
        print(f"\n{'='*80}")
        print(f"API: Received investigation request for: {incident.title}")
        print(f"Request data: {incident.dict()}")
        print(f"{'='*80}\n")
        
        incident_dict = incident.dict()
        
        # Log request details
        import logging
        logger_api = logging.getLogger("api")
        logger_api.info(f"Incident request received: {incident_dict}")
        
        result = await orchestrator.investigate(incident_dict)
        
        if result.get("status") == "failed":
            error_msg = result.get("error", "Unknown error")
            print(f"\n❌ Investigation failed: {error_msg}\n")
            raise HTTPException(
                status_code=500, 
                detail={
                    "error": error_msg,
                    "error_detail": result.get("error_detail", ""),
                    "incident_id": incident.title
                }
            )
        
        print(f"\n✅ Investigation completed successfully\n")
        return {
            "status": "success",
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        error_traceback = traceback.format_exc()
        
        print(f"\n❌ API Error: {error_msg}")
        print(f"Traceback: {error_traceback}\n")
        
        raise HTTPException(
            status_code=500, 
            detail={
                "error": error_msg,
                "error_detail": error_traceback,
                "incident_id": incident.title
            }
        )


@app.get("/api/knowledge-base/stats")
async def get_kb_stats():
    """Get knowledge base statistics"""
    try:
        stats = knowledge_manager.get_incident_statistics()
        return {
            "status": "success",
            "data": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/knowledge-base/incidents")
async def get_incidents(limit: int = 10):
    """Get recent incidents from knowledge base"""
    try:
        incidents_file = Path("knowledge_base/incidents.json")
        if not incidents_file.exists():
            return {"status": "success", "data": []}
        
        with open(incidents_file, 'r') as f:
            incidents = json.load(f)
        
        return {
            "status": "success",
            "data": incidents[-limit:] if incidents else []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/knowledge-base/root-causes")
async def get_root_causes(limit: int = 10):
    """Get root cause patterns"""
    try:
        root_causes_file = Path("knowledge_base/root_causes.json")
        if not root_causes_file.exists():
            return {"status": "success", "data": []}
        
        with open(root_causes_file, 'r') as f:
            root_causes = json.load(f)
        
        sorted_causes = sorted(root_causes, key=lambda x: x.get("frequency", 0), reverse=True)
        return {
            "status": "success",
            "data": sorted_causes[:limit]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/knowledge-base/solutions")
async def get_solutions(root_cause: Optional[str] = None):
    """Get solutions from knowledge base"""
    try:
        solutions_file = Path("knowledge_base/solutions.json")
        if not solutions_file.exists():
            return {"status": "success", "data": []}
        
        with open(solutions_file, 'r') as f:
            solutions = json.load(f)
        
        if root_cause:
            solutions = [s for s in solutions if root_cause.lower() in s.get("root_cause", "").lower()]
        
        return {
            "status": "success",
            "data": solutions[:10]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/knowledge-base/similar/{incident_title}")
async def find_similar_incidents(incident_title: str):
    """Find similar incidents"""
    try:
        test_incident = {
            "title": incident_title,
            "service": "unknown",
        }
        similar = knowledge_manager.find_similar_incidents(test_incident, 0.6)
        
        return {
            "status": "success",
            "data": [
                {
                    "id": s.get("id"),
                    "title": s.get("incident", {}).get("title"),
                    "similarity_score": s.get("similarity_score"),
                    "root_cause": s.get("investigation", {}).get("root_cause"),
                }
                for s in similar
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/store-incident")
async def store_incident_manually(incident: IncidentRequest, root_cause: str, solution: str):
    """Manually store an incident in knowledge base"""
    try:
        investigation = {
            "root_cause": root_cause,
            "solution": {"immediate_action": solution},
            "mttr_minutes": 30,
        }
        incident_dict = incident.dict()
        incident_id = knowledge_manager.store_incident(incident_dict, investigation)
        
        return {
            "status": "success",
            "incident_id": incident_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Serve static files
@app.get("/")
async def serve_frontend():
    """Serve frontend"""
    return FileResponse("frontend/index.html")


@app.get("/{path:path}")
async def serve_static(path: str):
    """Serve static assets"""
    file_path = f"frontend/{path}"
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return FileResponse("frontend/index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
