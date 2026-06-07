// API Base URL
const API_BASE = '/api';
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;

// Toast notification system
const Toast = {
    show: (message, type = 'info', duration = 5000) => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 10px 15px rgba(0,0,0,0.1);
            z-index: 9999;
            animation: slideIn 0.3s ease-in-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in-out';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Tab Navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        switchTab(tabName);
    });
});

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Load tab data
    if (tabName === 'knowledge') loadKnowledgeBase();
    else if (tabName === 'statistics') loadStatistics();
    else if (tabName === 'history') loadHistory();
}

// Check System Status
async function checkSystemStatus() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('system-status').textContent = '🟢 Healthy';
            document.querySelector('.status-dot').style.background = '#10b981';
        } else {
            document.getElementById('system-status').textContent = '🔴 Error';
            document.querySelector('.status-dot').style.background = '#ef4444';
            Toast.show('Backend health check failed', 'error', 5000);
        }
    } catch (error) {
        document.getElementById('system-status').textContent = '🔴 Offline';
        document.querySelector('.status-dot').style.background = '#ef4444';
        console.error('Health check error:', error);
        // Don't show toast for initial health check
    }
}

// Call health check on page load
checkSystemStatus();
// Recheck every 30 seconds
setInterval(checkSystemStatus, 30000);

// Investigate Form
document.getElementById('investigateForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Input Validation
    const title = document.getElementById('title').value?.trim();
    const severity = document.getElementById('severity').value?.trim();
    const service = document.getElementById('service').value?.trim();
    const description = document.getElementById('description').value?.trim();
    
    // Validate required fields
    if (!title || !severity || !service || !description) {
        Toast.show('Please fill in all required fields', 'error');
        return;
    }
    
    if (title.length < 3) {
        Toast.show('Incident title must be at least 3 characters', 'error');
        return;
    }
    
    if (description.length < 10) {
        Toast.show('Description must be at least 10 characters', 'error');
        return;
    }

    const affected = document.getElementById('affected').value.split(',').map(s => s.trim()).filter(s => s);
    const logsInput = document.getElementById('logs').value;

    let logs = [];
    if (logsInput) {
        try {
            logs = JSON.parse(logsInput);
        } catch (e) {
            Toast.show('Invalid JSON in logs field', 'error');
            console.error('JSON parse error:', e);
            return;
        }
    }

    const incident = {
        title,
        severity,
        service,
        affected_services: affected,
        description,
        logs
    };

    showLoadingSpinner(true);
    
    // Submit with retry logic
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
            
            const response = await fetch(`${API_BASE}/investigate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(incident),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            const data = await response.json();
            showLoadingSpinner(false);

            if (response.ok) {
                Toast.show('✅ Investigation completed successfully', 'success');
                displayInvestigationResults(data.data);
                return;
            } else {
                // Extract error message
                const errorMessage = 
                    data?.detail?.message ||
                    data?.detail?.error ||
                    data?.detail ||
                    data?.error ||
                    JSON.stringify(data) ||
                    'Unknown error occurred';
                
                lastError = errorMessage;
                console.error(`Attempt ${attempt} failed:`, data);
                
                // Retry if not the last attempt and error might be temporary
                if (attempt < MAX_RETRIES && response.status >= 500) {
                    Toast.show(`Retrying... (attempt ${attempt}/${MAX_RETRIES})`, 'info', 2000);
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    continue;
                }
                
                Toast.show(`Investigation failed: ${errorMessage}`, 'error', 10000);
                break;
            }
        } catch (error) {
            lastError = error;
            console.error(`Attempt ${attempt} network error:`, error);
            
            if (error.name === 'AbortError') {
                Toast.show('Request timeout. Please try again.', 'error');
                break;
            }
            
            if (attempt < MAX_RETRIES) {
                Toast.show(`Network error. Retrying... (attempt ${attempt}/${MAX_RETRIES})`, 'info', 2000);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                continue;
            }
            
            const errorMessage = 
                error?.response?.data?.detail ||
                error?.response?.data?.message ||
                error?.message ||
                error?.toString() ||
                'Unknown network error occurred';
            
            Toast.show(`Network error: ${errorMessage}`, 'error', 10000);
        }
    }
    
    showLoadingSpinner(false);
});

function displayInvestigationResults(result) {
    const container = document.getElementById('investigationResults');
    
    // Result Status
    document.getElementById('resultStatus').textContent = 
        result.status === 'completed' ? '✅ Investigation Complete' : '⚠️ Investigation In Progress';
    const duration = (result.duration_minutes || 0);
    document.getElementById('resultTime').textContent = 
        `Completed in ${duration.toFixed ? duration.toFixed(3) : duration} minutes`;

    // Root Cause
    document.getElementById('resultRootCause').textContent = result.root_cause || 'Unknown';
    const confidence = result.root_cause_confidence || 0;
    document.getElementById('confidenceBar').style.width = `${confidence * 100}%`;
    document.getElementById('confidenceText').textContent = `Confidence: ${(confidence * 100).toFixed(0)}%`;

    // Immediate Action
    document.getElementById('resultAction').textContent = 
        result.solution?.immediate_action || 'No action available';

    // MTTR
    const mttrMinutes = result.mttr_minutes || 0;
    document.getElementById('resultMTTR').textContent = 
        `${mttrMinutes.toFixed ? mttrMinutes.toFixed(1) : mttrMinutes} minutes`;

    // Remediation Steps
    const stepsContainer = document.getElementById('remediationSteps');
    stepsContainer.innerHTML = '';
    if (result.remediation_plan && result.remediation_plan.length > 0) {
        result.remediation_plan.forEach((step, index) => {
            const stepEl = document.createElement('div');
            stepEl.className = 'remediation-step';
            stepEl.innerHTML = `
                <div class="step-number">${step.step}</div>
                <div class="step-content">
                    <h5>${step.action}</h5>
                    <p>${step.priority}</p>
                    <span class="priority-badge priority-${step.priority}">${step.priority.toUpperCase()}</span>
                    <p>Est. Time: ${step.estimated_time_minutes} minutes</p>
                </div>
            `;
            stepsContainer.appendChild(stepEl);
        });
    }

    // Similar Incidents
    const similarContainer = document.getElementById('similarList');
    similarContainer.innerHTML = '';
    if (result.similar_incidents && result.similar_incidents.length > 0) {
        result.similar_incidents.forEach(incident => {
            const itemEl = document.createElement('div');
            itemEl.className = 'similar-item';
            itemEl.innerHTML = `
                <h5>${incident.title}</h5>
                <p>ID: ${incident.id}</p>
                <p>Root Cause: ${incident.mttr_minutes}</p>
                <span class="similarity-score">${(incident.similarity_score * 100).toFixed(0)}% match</span>
            `;
            similarContainer.appendChild(itemEl);
        });
    } else {
        similarContainer.innerHTML = '<p>No similar incidents found</p>';
    }

    container.style.display = 'block';
}

// Load Knowledge Base with error boundary
async function loadKnowledgeBase() {
    try {
        Toast.show('Loading knowledge base...', 'info', 3000);
        const [incidents, rootCauses, solutions] = await Promise.all([
            fetch(`${API_BASE}/knowledge-base/incidents?limit=5`).then(r => {
                if (!r.ok) throw new Error(`API error: ${r.status}`);
                return r.json();
            }),
            fetch(`${API_BASE}/knowledge-base/root-causes?limit=5`).then(r => {
                if (!r.ok) throw new Error(`API error: ${r.status}`);
                return r.json();
            }),
            fetch(`${API_BASE}/knowledge-base/solutions`).then(r => {
                if (!r.ok) throw new Error(`API error: ${r.status}`);
                return r.json();
            })
        ]);

        // Incidents
        const incidentsList = document.getElementById('incidentsList');
        incidentsList.innerHTML = '';
        if (incidents.data && incidents.data.length > 0) {
            incidents.data.forEach(inc => {
                const el = document.createElement('div');
                el.className = 'kb-item';
                el.innerHTML = `
                    <h4>${inc.incident?.title || 'Unknown'}</h4>
                    <p>Service: ${inc.incident?.service}</p>
                    <p>Root Cause: ${inc.investigation?.root_cause}</p>
                    <p>MTTR: ${inc.mttr_minutes?.toFixed(1) || 'N/A'} min</p>
                `;
                incidentsList.appendChild(el);
            });
        } else {
            incidentsList.innerHTML = '<p>No incidents in knowledge base</p>';
        }

        // Root Causes
        const rootCausesList = document.getElementById('rootCausesList');
        rootCausesList.innerHTML = '';
        if (rootCauses.data && rootCauses.data.length > 0) {
            rootCauses.data.forEach(cause => {
                const el = document.createElement('div');
                el.className = 'kb-item';
                el.innerHTML = `
                    <h4>${cause.cause}</h4>
                    <span class="frequency-badge">Frequency: ${cause.frequency}</span>
                `;
                rootCausesList.appendChild(el);
            });
        } else {
            rootCausesList.innerHTML = '<p>No root causes found</p>';
        }

        // Solutions
        const solutionsList = document.getElementById('solutionsList');
        solutionsList.innerHTML = '';
        if (solutions.data && solutions.data.length > 0) {
            solutions.data.slice(0, 5).forEach(sol => {
                const el = document.createElement('div');
                el.className = 'kb-item';
                
                // Handle solution field that might be object or string
                let solutionText = '';
                if (typeof sol.solution === 'object' && sol.solution !== null) {
                    solutionText = sol.solution?.immediate_action || 
                                  sol.solution?.description || 
                                  JSON.stringify(sol.solution);
                } else {
                    solutionText = sol.solution || 'No solution details';
                }
                
                el.innerHTML = `
                    <h4>${sol.root_cause}</h4>
                    <p>${solutionText}</p>
                    <p>Score: ${(sol.effectiveness_score * 100).toFixed(0)}%</p>
                `;
                solutionsList.appendChild(el);
            });
        } else {
            solutionsList.innerHTML = '<p>No solutions found</p>';
        }
        
        Toast.show('Knowledge base loaded', 'success');
    } catch (error) {
        console.error('Error loading knowledge base:', error);
        document.getElementById('incidentsList').innerHTML = `<p style="color: red;">Error loading data: ${error.message}</p>`;
        document.getElementById('rootCausesList').innerHTML = `<p style="color: red;">Error loading data</p>`;
        document.getElementById('solutionsList').innerHTML = `<p style="color: red;">Error loading data</p>`;
        Toast.show('Failed to load knowledge base', 'error');
    }
}

// Load Statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${API_BASE}/knowledge-base/stats`);
        const data = await response.json();
        const stats = data.data;

        // Update stat cards
        document.getElementById('statTotalIncidents').textContent = stats.total_incidents || 0;
        document.getElementById('statRootCauses').textContent = stats.total_root_causes || 0;
        document.getElementById('statSolutions').textContent = stats.total_solutions || 0;
        document.getElementById('statMTTR').textContent = 
            `${stats.average_mttr_minutes?.toFixed(1) || 'N/A'} min`;

        // Severity Chart
        const severityChart = document.getElementById('severityChart');
        severityChart.innerHTML = '';
        if (stats.incidents_by_severity) {
            const maxSeverity = Math.max(...Object.values(stats.incidents_by_severity));
            Object.entries(stats.incidents_by_severity).forEach(([severity, count]) => {
                const percentage = (count / maxSeverity) * 100;
                const el = document.createElement('div');
                el.className = 'chart-item';
                el.innerHTML = `
                    <div class="chart-label">${severity}</div>
                    <div class="chart-bar">
                        <div class="chart-fill" style="width: ${percentage}%">${count}</div>
                    </div>
                `;
                severityChart.appendChild(el);
            });
        }

        // Service Chart
        const serviceChart = document.getElementById('serviceChart');
        serviceChart.innerHTML = '';
        if (stats.incidents_by_service) {
            const maxService = Math.max(...Object.values(stats.incidents_by_service));
            Object.entries(stats.incidents_by_service).slice(0, 10).forEach(([service, count]) => {
                const percentage = (count / maxService) * 100;
                const el = document.createElement('div');
                el.className = 'chart-item';
                el.innerHTML = `
                    <div class="chart-label">${service}</div>
                    <div class="chart-bar">
                        <div class="chart-fill" style="width: ${percentage}%">${count}</div>
                    </div>
                `;
                serviceChart.appendChild(el);
            });
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Load History
async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE}/knowledge-base/incidents?limit=20`);
        const data = await response.json();
        const incidents = data.data;

        const timeline = document.getElementById('historyTimeline');
        timeline.innerHTML = '';
        if (incidents && incidents.length > 0) {
            incidents.reverse().forEach(inc => {
                const el = document.createElement('div');
                el.className = 'timeline-item';
                el.innerHTML = `
                    <div class="timeline-content">
                        <h4>${inc.incident?.title || 'Unknown'}</h4>
                        <p>Service: ${inc.incident?.service}</p>
                        <p>Severity: ${inc.severity}</p>
                        <p>Root Cause: ${inc.investigation?.root_cause}</p>
                        <p>MTTR: ${inc.mttr_minutes?.toFixed(1) || 'N/A'} minutes</p>
                        <small>${new Date(inc.timestamp).toLocaleString()}</small>
                    </div>
                `;
                timeline.appendChild(el);
            });
        } else {
            timeline.innerHTML = '<p>No investigation history</p>';
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Utilities
function showLoadingSpinner(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.remove('hidden');
    } else {
        spinner.classList.add('hidden');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkSystemStatus();
    setInterval(checkSystemStatus, 30000);
});
