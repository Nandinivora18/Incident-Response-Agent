#!/bin/bash

# Incident Response Agent - Quick Start Script

echo "================================"
echo "Incident Response Agent"
echo "Quick Start Setup"
echo "================================"
echo ""

# Check Python version
echo "✓ Checking Python version..."
python --version

# Create virtual environment
echo "✓ Creating virtual environment..."
python -m venv venv

# Activate virtual environment
echo "✓ Activating virtual environment..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Install dependencies
echo "✓ Installing dependencies..."
pip install -r requirements.txt

# Create .env file
echo "✓ Creating configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "  - Created .env file (edit with your API keys)"
fi

# Create directories
echo "✓ Creating directories..."
mkdir -p logs data knowledge_base/{incidents,patterns,solutions}

echo ""
echo "================================"
echo "Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Edit .env with your API keys (OpenAI, Slack, etc.)"
echo "2. Run the agent:"
echo "   python main.py"
echo ""
echo "Or use Docker:"
echo "   docker-compose up -d"
echo ""
echo "For more information, see README.md"
echo ""
