@echo off
REM Incident Response Agent - Quick Start Script for Windows

echo.
echo ================================
echo Incident Response Agent
echo Quick Start Setup
echo ================================
echo.

REM Check Python version
echo Checking Python version...
python --version

REM Create virtual environment
echo Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Create .env file
echo Creating configuration...
if not exist .env (
    copy .env.example .env
    echo Created .env file (edit with your API keys)
)

REM Create directories
echo Creating directories...
if not exist logs mkdir logs
if not exist data mkdir data
if not exist knowledge_base\incidents mkdir knowledge_base\incidents

echo.
echo ================================
echo Setup Complete!
echo ================================
echo.
echo Next steps:
echo 1. Edit .env with your API keys (OpenAI, Slack, etc.)
echo 2. Run the agent:
echo    python main.py
echo.
echo Or use Docker:
echo    docker-compose up -d
echo.
echo For more information, see README.md
echo.
pause
