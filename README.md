# Incident Response Agent

An AI-powered incident response agent that learns from historical incidents and automatically investigates, analyzes, and suggests solutions for production incidents.

## 🎯 Overview

This project combines **Aurora** (automated incident investigation) and **IncidentFox** (AI SRE platform) to create a comprehensive incident response system that:

- **Learns from History**: Maintains a knowledge base of past incidents, root causes, and resolution strategies
- **Autonomous Investigation**: Automatically analyzes incidents across infrastructure, logs, metrics, and code
- **Root Cause Analysis**: Uses AI to identify root causes and suggest remediation steps
- **Chat Integration**: Works seamlessly with Slack, Microsoft Teams, and Google Chat
- **Multi-Agent Orchestration**: Specialized agents for Kubernetes, cloud platforms, metrics, and code analysis
- **Historical Context**: Improves response times by leveraging previous similar incident experiences

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Docker & Docker Compose (optional)
- LLM API access (OpenAI, Anthropic, etc.)

### Installation

```bash
cd incident-response-agent
pip install -r requirements.txt
```

### Configuration

1. Create a `.env` file:
```bash
cp .env.example .env
```

2. Configure your LLM provider and integrations:
```env
OPENAI_API_KEY=your_key
SLACK_BOT_TOKEN=your_token
INCIDENT_MEMORY_DB=memory.json
```

### Run the Agent

```bash
python main.py
```

## 📁 Project Structure

```
incident-response-agent/
├── backend/              # Core backend services
├── agents/              # Multi-agent modules
│   ├── investigator_agent.py    # Main investigator
│   ├── kubernetes_agent.py       # K8s specialist
│   ├── cloud_agent.py            # Cloud platform agent
│   └── metrics_agent.py          # Metrics analysis
├── knowledge_base/      # Historical incident database
│   ├── incidents.json           # Past incidents
│   ├── root_causes.json         # Root cause catalog
│   └── solutions.json           # Solution templates
├── integrations/        # External service connectors
│   ├── slack_bot.py              # Slack integration
│   ├── teams_connector.py        # MS Teams integration
│   └── monitoring.py             # Monitoring tools
├── config/              # Configuration management
├── tests/               # Test suite
├── main.py              # Entry point
├── requirements.txt     # Dependencies
└── docker-compose.yml   # Docker setup
```

## 🛠️ Architecture

### Multi-Agent System

1. **Incident Detector**: Monitors alerts and triggers investigation
2. **Knowledge Retriever**: Searches historical incidents for similar cases
3. **Infrastructure Agent**: Queries cloud platforms, Kubernetes, APIs
4. **Log Analyzer**: Processes and analyzes logs
5. **Metrics Analyzer**: Correlates metrics and identifies patterns
6. **Root Cause Agent**: Synthesizes findings and identifies root causes
7. **Solution Agent**: Suggests remediation steps and solutions

### Knowledge Base

The system maintains a comprehensive knowledge base:
- Historical incidents with outcomes
- Root cause patterns
- Resolution strategies
- Mitigation techniques
- Runbook references

## 🔄 Incident Response Workflow

```
1. Alert Triggered
   ↓
2. Search Historical Knowledge
   └─→ Find Similar Past Incidents
   └─→ Retrieve Resolution Patterns
   ↓
3. Autonomous Investigation
   └─→ Query Infrastructure
   └─→ Analyze Logs & Metrics
   └─→ Check Code Changes
   ↓
4. Root Cause Analysis
   └─→ Correlate Data
   └─→ Apply Pattern Matching
   └─→ AI Analysis
   ↓
5. Solution Recommendation
   └─→ Suggest Fixes
   └─→ Estimate Impact
   └─→ Provide Runbooks
   ↓
6. Update Knowledge Base
   └─→ Store Incident
   └─→ Record Root Cause
   └─→ Save Resolution
   └─→ Improve Future Responses
```

## 💡 Features

### Incident Learning
- Stores complete incident history
- Tracks root causes and patterns
- Maintains solution effectiveness metrics
- Learns from community experiences

### Automatic Investigation
- Queries multiple infrastructure sources
- Correlates logs, metrics, and events
- Analyzes code changes and deployments
- Identifies suspicious patterns

### Intelligent Recommendations
- AI-powered root cause analysis
- Contextual solution suggestions
- Risk assessment and impact estimation
- Runbook and escalation guidance

### Chat Integration
- Slack bot for incident threads
- Microsoft Teams integration
- Google Chat support
- Real-time notifications and updates

## 📊 Example: Learning from Incidents

### Incident 1: Database Connection Pool Exhaustion
```json
{
  "id": "INC-2024-001",
  "title": "Database connection pool exhaustion",
  "root_cause": "High connection leak in service X",
  "resolution": "Updated configuration to return connections properly",
  "prevention": "Added connection pool monitoring alert",
  "mttr": "45 minutes",
  "tags": ["database", "connection-pool", "memory-leak"]
}
```

### Similar Future Incident
Agent quickly recognizes pattern and suggests:
- Check connection pool metrics
- Review recent code changes in service X
- Apply previously successful fix
- **Result: MTTR reduced from 45 min to 5 min**

## 🔗 Integrations

### Monitoring & Observability
- Prometheus & Grafana
- DataDog
- New Relic
- Elastic Stack
- Splunk

### Infrastructure
- AWS, Azure, GCP
- Kubernetes
- Terraform
- SSH/command execution

### Chat & Notifications
- Slack
- Microsoft Teams
- Google Chat
- Email

### Version Control
- GitHub
- GitLab
- Bitbucket

## 🧪 Testing

```bash
# Run all tests
python -m pytest tests/

# Run specific test suite
python -m pytest tests/agents/

# Run with coverage
python -m pytest --cov=. tests/
```

## 🐳 Docker Setup

```bash
# Build and run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f agent
```

## 📈 Performance Metrics

Track improvements over time:
- **MTTR (Mean Time To Resolve)**: Reduced with historical knowledge
- **MTTIC (Mean Time To Initial Collaboration)**: Faster with auto-investigation
- **Recurrence Rate**: Decreases as knowledge base grows
- **Accuracy**: Improves as agent learns

## 🤝 Contributing

Contributions welcome! Areas for enhancement:
- Additional ML models for pattern detection
- New integration connectors
- Enhanced knowledge base searches
- UI/UX improvements
- Performance optimizations

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📝 License

Apache 2.0 - See [LICENSE](LICENSE) for details

## 🔗 Resources

- [Aurora Documentation](https://github.com/Arvo-AI/aurora)
- [IncidentFox Documentation](https://github.com/incidentfox/incidentfox)
- [LangGraph Docs](https://langchain-ai.github.io/langgraph/)
- [Slack Bot API](https://api.slack.com/)

## 📞 Support

- Join our community discussions
- Report issues on GitHub
- Check documentation for FAQs
- Contact support team

---

**Built with ❤️ merging Aurora & IncidentFox for better incident response**
