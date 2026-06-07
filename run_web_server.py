"""
Web Server for Incident Response Agent
Runs FastAPI server with frontend
"""

import os
import sys
import asyncio
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from api.server import app
import uvicorn


if __name__ == "__main__":
    print("\n" + "="*80)
    print("INCIDENT RESPONSE AGENT - WEB SERVER")
    print("="*80)
    print("\n🚀 Starting FastAPI server...")
    print("📱 Frontend URL: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("🔄 ReDoc: http://localhost:8000/redoc")
    print("\nPress Ctrl+C to stop the server\n")
    print("="*80 + "\n")
    
    # Run Uvicorn server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )
