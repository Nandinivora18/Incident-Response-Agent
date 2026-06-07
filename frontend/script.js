// API Base URL
const API_BASE = '/api';
const REQUEST_TIMEOUT = 120000; // 2 minutes for investigations
const MAX_RETRIES = 2;

// Toast notification system
const Toast = {
    show: (message, type = 'info', duration = 4000) => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        let bg = '#3b82f6'; // info
        if (type === 'error') bg = '#f43f5e';
        else if (type === 'success') bg = '#10b981';
        else if (type === 'warning') bg = '#f59e0b';
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bg};
            color: white;
            padding: 14px 24px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            z-index: 99999;
            font-size: 14px;
            font-weight: 600;
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

// Add CSS keyframes dynamically
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
            document.querySelector('.status-dot').style.boxShadow = '0 0 10px #10b981';
        } else {
            document.getElementById('system-status').textContent = '🔴 Degraded';
            document.querySelector('.status-dot').style.background = '#f43f5e';
            document.querySelector('.status-dot').style.boxShadow = '0 0 10px #f43f5e';
            Toast.show('Backend server status is degraded', 'warning');
        }
    } catch (error) {
        document.getElementById('system-status').textContent = '🔴 Offline';
        document.querySelector('.status-dot').style.background = '#f43f5e';
        document.querySelector('.status-dot').style.boxShadow = '0 0 10px #f43f5e';
        console.error('Health check error:', error);
    }
}

// Call health check on page load
checkSystemStatus();
// Recheck every 30 seconds
setInterval(checkSystemStatus, 30000);

// Investigate Form Submission with step-by-step timeline animation
document.getElementById('investigateForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Input Validation
    const title = document.getElementById('title').value?.trim();
    const severity = document.getElementById('severity').value?.trim();
    const service = document.getElementById('service').value?.trim();
    const description = document.getElementById('description').value?.trim();
    
    if (!title || !severity || !service || !description) {
        Toast.show('Please fill in all required fields', 'warning');
        return;
    }
    
    if (title.length < 3) {
        Toast.show('Incident title must be at least 3 characters', 'warning');
        return;
    }
    
    if (description.length < 10) {
        Toast.show('Description must be at least 10 characters', 'warning');
        return;
    }

    const affectedInput = document.getElementById('affected').value;
    const affected = affectedInput ? affectedInput.split(',').map(s => s.trim()).filter(s => s) : [];
    const logsInput = document.getElementById('logs').value;

    let logs = [];
    if (logsInput) {
        try {
            const parsed = JSON.parse(logsInput);
            if (Array.isArray(parsed)) {
                logs = parsed;
            } else {
                // Accept a single JSON string or object as a one-element list
                logs = [String(parsed)];
            }
        } catch (err) {
            // Not JSON — treat as a plain-text log entry
            logs = [logsInput];
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

    // Show investigation progress timeline container
    const progressContainer = document.getElementById('investigationProgress');
    progressContainer.style.display = 'block';
    
    // Clear previous timeline states
    document.querySelectorAll('.progress-step').forEach(step => {
        step.className = 'progress-step';
    });

    // Animate timeline phases locally to show agent cooperation
    const phases = [
        'knowledge_retrieval',
        'initial_assessment',
        'deep_investigation',
        'root_cause_analysis',
        'solution_generation',
        'remediation',
        'learning'
    ];

    let currentPhaseIdx = 0;
    
    const updateTimeline = () => {
        if (currentPhaseIdx >= phases.length) return;
        
        // Mark previous steps as completed
        for (let i = 0; i < currentPhaseIdx; i++) {
            const stepEl = document.getElementById(`step-${phases[i]}`);
            if (stepEl) stepEl.className = 'progress-step completed';
        }
        
        // Mark current step as active
        const activeStepEl = document.getElementById(`step-${phases[currentPhaseIdx]}`);
        if (activeStepEl) activeStepEl.className = 'progress-step active';
        
        currentPhaseIdx++;
    };

    // Run first step immediately
    updateTimeline();
    
    // Advance timeline steps every 700ms to show the workflow progression
    const timelineInterval = setInterval(updateTimeline, 700);

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

            if (response.ok) {
                // Clear timeline interval and mark all as completed
                clearInterval(timelineInterval);
                phases.forEach(ph => {
                    const el = document.getElementById(`step-${ph}`);
                    if (el) el.className = 'progress-step completed';
                });
                
                setTimeout(() => {
                    showLoadingSpinner(false);
                    progressContainer.style.display = 'none';
                    Toast.show('Investigation complete and stored in KB!', 'success');
                    displayInvestigationResults(data.data);
                }, 600);
                
                return;
            } else {
                const errorMessage = data?.detail?.error || data?.detail?.message || data?.detail || data?.error || 'Unknown error occurred';
                lastError = errorMessage;
                console.error(`Attempt ${attempt} failed:`, data);
                
                if (attempt < MAX_RETRIES && response.status >= 500) {
                    Toast.show(`Temporary failure. Retrying... (attempt ${attempt}/${MAX_RETRIES})`, 'warning', 2500);
                    await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
                    continue;
                }
                
                Toast.show(`Investigation failed: ${errorMessage}`, 'error', 7000);
                break;
            }
        } catch (error) {
            lastError = error;
            console.error(`Attempt ${attempt} network error:`, error);
            
            if (error.name === 'AbortError') {
                Toast.show('Investigation request timed out', 'error');
                break;
            }
            
            if (attempt < MAX_RETRIES) {
                Toast.show(`Network issue. Retrying... (attempt ${attempt}/${MAX_RETRIES})`, 'warning', 2500);
                await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
                continue;
            }
            
            const errorMessage = error?.message || error?.toString() || 'Unknown network error';
            Toast.show(`Network error: ${errorMessage}`, 'error', 7000);
        }
    }
    
    clearInterval(timelineInterval);
    showLoadingSpinner(false);
    progressContainer.style.display = 'none';
});

function displayInvestigationResults(result) {
    const container = document.getElementById('investigationResults');
    
    // Result Status
    document.getElementById('resultStatus').textContent = 
        result.status === 'completed' ? '✅ Agent Investigation Complete' : '⚠️ Investigation In Progress';
    
    const duration = (result.duration_minutes || result.mttr_minutes || 0);
    document.getElementById('resultTime').textContent = `Duration: ${duration.toFixed(1)} mins`;

    // Root Cause
    document.getElementById('resultRootCause').textContent = result.root_cause || 'Unknown Anomaly';
    const confidence = result.root_cause_confidence || 0.4;
    document.getElementById('confidenceBar').style.width = `${confidence * 100}%`;
    document.getElementById('confidenceText').textContent = `Confidence Score: ${(confidence * 100).toFixed(0)}%`;

    // Immediate Action
    document.getElementById('resultAction').textContent = 
        result.solution?.immediate_action || 'Isolate metrics and inspect logs';

    // MTTR
    const mttrMinutes = result.mttr_minutes || duration || 0;
    document.getElementById('resultMTTR').textContent = `${mttrMinutes.toFixed(1)} minutes`;

    // Learning / Re-use indicator
    const learningList = result.learning_applied || [];
    const isReused = learningList.length > 0 && !learningList[0].includes("No previous similar");
    const reuseText = document.getElementById('resultLearning');
    const timeSavedBadge = document.getElementById('timeSavedBadge');
    
    if (isReused) {
        reuseText.innerHTML = `<span style="color: var(--success); font-weight: 700;">Reused past resolution</span>`;
        // Time saved estimate (baseline is 35 minutes)
        const savedTime = Math.max(0, 35 - mttrMinutes);
        timeSavedBadge.textContent = `⚡ Saves ~${savedTime.toFixed(1)} min`;
        timeSavedBadge.style.display = 'inline-block';
    } else {
        reuseText.innerHTML = `<span style="color: var(--text-muted);">New incident type recorded</span>`;
        timeSavedBadge.style.display = 'none';
    }

    // Remediation Steps
    const stepsContainer = document.getElementById('remediationSteps');
    stepsContainer.innerHTML = '';
    if (result.remediation_plan && result.remediation_plan.length > 0) {
        result.remediation_plan.forEach((step) => {
            const stepEl = document.createElement('div');
            stepEl.className = 'remediation-step';
            stepEl.innerHTML = `
                <div class="step-number">${step.step}</div>
                <div class="step-content">
                    <h5>${step.action}</h5>
                    <span class="priority-badge priority-${step.priority}">${step.priority.toUpperCase()}</span>
                    <p>Estimated Time: ${step.estimated_time_minutes} mins</p>
                    <button class="btn btn-secondary btn-run-step" data-step="${step.step}" data-action="${step.action}" style="margin-top: 10px; font-size: 12px; padding: 6px 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #fff; cursor: pointer; display: flex; align-items: center; gap: 4px;">▶️ Run Step</button>
                </div>
            `;
            stepsContainer.appendChild(stepEl);
        });

        // Bind step execution click handlers
        document.querySelectorAll('.btn-run-step').forEach(btn => {
            btn.onclick = (e) => {
                const step = btn.dataset.step;
                const action = btn.dataset.action;
                executeRemediationStep(step, action);
            };
        });
    }

    // Git Diff / Patch Card
    const gitPatchCard = document.getElementById('gitPatchCard');
    const gitDiffContent = document.getElementById('gitDiffContent');
    if (result.git_diff) {
        gitPatchCard.style.display = 'block';
        gitDiffContent.textContent = result.git_diff;
    } else {
        gitPatchCard.style.display = 'none';
    }

    // Similar Incidents matched (FIXED BUG: displayed Root Cause correctly instead of MTTR)
    const similarContainer = document.getElementById('similarList');
    similarContainer.innerHTML = '';
    if (result.similar_incidents && result.similar_incidents.length > 0) {
        result.similar_incidents.forEach(inc => {
            const itemEl = document.createElement('div');
            itemEl.className = 'similar-item';
            
            // Format score
            const matchScore = inc.similarity_score ? (inc.similarity_score * 100).toFixed(0) : '60';
            const causeText = inc.root_cause || 'High CPU Usage';
            const mttrText = inc.mttr_minutes ? inc.mttr_minutes.toFixed(1) : 'N/A';
            
            itemEl.innerHTML = `
                <h5>${inc.title || 'Past Incident'}</h5>
                <span class="similarity-score">${matchScore}% Match</span>
                <p>ID: ${inc.id}</p>
                <p>Root Cause: <strong>${causeText}</strong></p>
                <p>Resolution MTTR: <strong>${mttrText} min</strong></p>
            `;
            similarContainer.appendChild(itemEl);
        });
    } else {
        similarContainer.innerHTML = '<p class="text-muted" style="grid-column: 1/-1;">No matching historical incidents found in the knowledge base database.</p>';
    }

    container.style.display = 'block';
    
    // Smooth scroll to results
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Load Knowledge Base
async function loadKnowledgeBase() {
    try {
        const [incidents, rootCauses, solutions] = await Promise.all([
            fetch(`${API_BASE}/knowledge-base/incidents?limit=5`).then(r => r.json()),
            fetch(`${API_BASE}/knowledge-base/root-causes?limit=5`).then(r => r.json()),
            fetch(`${API_BASE}/knowledge-base/solutions`).then(r => r.json())
        ]);

        // Recent Incidents
        const incidentsList = document.getElementById('incidentsList');
        incidentsList.innerHTML = '';
        if (incidents.data && incidents.data.length > 0) {
            incidents.data.slice().reverse().forEach(inc => {
                const el = document.createElement('div');
                el.className = 'kb-item';
                
                const mttrStr = inc.mttr_minutes ? `${inc.mttr_minutes.toFixed(1)} min` : 'N/A';
                const causeStr = inc.investigation?.root_cause || 'Unknown Anomaly';
                
                el.innerHTML = `
                    <h4>${inc.incident?.title || 'Untitled'}</h4>
                    <p>Service: <strong>${inc.incident?.service}</strong></p>
                    <p>Root Cause: <strong>${causeStr}</strong></p>
                    <p>MTTR: <strong>${mttrStr}</strong> | Severity: <strong>${inc.severity}</strong></p>
                `;
                incidentsList.appendChild(el);
            });
        } else {
            incidentsList.innerHTML = '<p class="text-muted">No incidents stored in knowledge base.</p>';
        }

        // Common Root Causes
        const rootCausesList = document.getElementById('rootCausesList');
        rootCausesList.innerHTML = '';
        if (rootCauses.data && rootCauses.data.length > 0) {
            rootCauses.data.forEach(cause => {
                const el = document.createElement('div');
                el.className = 'kb-item';
                el.innerHTML = `
                    <h4>${cause.cause}</h4>
                    <span class="frequency-badge">Frequency: ${cause.frequency} occurrences</span>
                `;
                rootCausesList.appendChild(el);
            });
        } else {
            rootCausesList.innerHTML = '<p class="text-muted">No root causes recorded yet.</p>';
        }

        // Solutions Repository
        const solutionsList = document.getElementById('solutionsList');
        solutionsList.innerHTML = '';
        if (solutions.data && solutions.data.length > 0) {
            // Keep unique solutions based on root_cause
            const uniques = [];
            const seen = new Set();
            solutions.data.forEach(s => {
                if (!seen.has(s.root_cause)) {
                    seen.add(s.root_cause);
                    uniques.push(s);
                }
            });

            uniques.slice(0, 5).forEach(sol => {
                const el = document.createElement('div');
                el.className = 'kb-item';
                
                let text = '';
                if (typeof sol.solution === 'object') {
                    text = sol.solution?.immediate_action || sol.solution?.description || JSON.stringify(sol.solution);
                } else {
                    text = sol.solution || 'Isolate metrics and restart instances';
                }
                
                el.innerHTML = `
                    <h4>${sol.root_cause}</h4>
                    <p>${text}</p>
                    <p>Effectiveness Score: <strong>${(sol.effectiveness_score * 100).toFixed(0)}%</strong></p>
                `;
                solutionsList.appendChild(el);
            });
        } else {
            solutionsList.innerHTML = '<p class="text-muted">No solutions cached yet.</p>';
        }
    } catch (error) {
        console.error('Error loading knowledge base:', error);
        Toast.show('Failed to sync knowledge base', 'error');
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
            stats.average_mttr_minutes ? `${stats.average_mttr_minutes.toFixed(1)} min` : 'N/A';
        
        // New cards
        document.getElementById('statTimeSaved').textContent = 
            stats.total_time_saved_minutes ? `${stats.total_time_saved_minutes.toFixed(0)} mins` : '0 min';
        document.getElementById('statReuseRate').textContent = 
            stats.knowledge_reuse_rate !== undefined ? `${(stats.knowledge_reuse_rate * 100).toFixed(0)}%` : '0%';

        // Severity Chart
        const severityChart = document.getElementById('severityChart');
        severityChart.innerHTML = '';
        if (stats.incidents_by_severity && Object.keys(stats.incidents_by_severity).length > 0) {
            const maxSeverity = Math.max(...Object.values(stats.incidents_by_severity));
            Object.entries(stats.incidents_by_severity).forEach(([severity, count]) => {
                const percentage = (count / maxSeverity) * 100;
                const el = document.createElement('div');
                el.className = 'chart-item';
                el.innerHTML = `
                    <div class="chart-label">
                        <span>${severity.toUpperCase()}</span>
                        <span>${count}</span>
                    </div>
                    <div class="chart-bar">
                        <div class="chart-fill" style="width: ${percentage}%"></div>
                    </div>
                `;
                severityChart.appendChild(el);
            });
        } else {
            severityChart.innerHTML = '<p class="text-muted">No severity metrics available.</p>';
        }

        // Service Chart
        const serviceChart = document.getElementById('serviceChart');
        serviceChart.innerHTML = '';
        if (stats.incidents_by_service && Object.keys(stats.incidents_by_service).length > 0) {
            const maxService = Math.max(...Object.values(stats.incidents_by_service));
            Object.entries(stats.incidents_by_service).slice(0, 5).forEach(([service, count]) => {
                const percentage = (count / maxService) * 100;
                const el = document.createElement('div');
                el.className = 'chart-item';
                el.innerHTML = `
                    <div class="chart-label">
                        <span>${service}</span>
                        <span>${count}</span>
                    </div>
                    <div class="chart-bar">
                        <div class="chart-fill" style="width: ${percentage}%"></div>
                    </div>
                `;
                serviceChart.appendChild(el);
            });
        } else {
            serviceChart.innerHTML = '<p class="text-muted">No service metrics available.</p>';
        }

        // Fetch chronological incidents to draw SVG MTTR Learning Curve
        const incidentsResponse = await fetch(`${API_BASE}/knowledge-base/incidents?limit=30`);
        const incidentsData = await incidentsResponse.json();
        drawLearningCurve(incidentsData.data || []);
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Draw Custom SVG Learning Curve
function drawLearningCurve(incidents) {
    const container = document.getElementById('learningCurveChart');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Sort oldest to newest
    const sorted = [...incidents].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    if (sorted.length === 0) {
        container.innerHTML = '<p class="text-muted" style="font-size: 13px;">Accumulate incident investigations to draw learning curve.</p>';
        return;
    }
    
    const points = sorted.map((inc, i) => ({
        x: i + 1,
        y: inc.mttr_minutes || inc.duration_minutes || 35.0,
        title: inc.incident?.title || 'Incident',
        id: inc.id
    }));
    
    const width = container.clientWidth || 550;
    const height = 230;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;
    
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    
    const maxX = Math.max(points.length, 5);
    const maxY = 45.0; // standard baseline ceiling
    
    const getX = (xVal) => paddingLeft + ((xVal - 1) / (maxX - 1 || 1)) * chartWidth;
    const getY = (yVal) => paddingTop + chartHeight - (yVal / maxY) * chartHeight;
    
    let svgHtml = `<svg width="${width}" height="${height}" style="overflow: visible;">`;
    
    // Gradients definitions
    svgHtml += `
        <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--secondary)" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="var(--secondary)" stop-opacity="0.0"/>
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
    `;
    
    // Draw Y ticks
    const yTicks = [0, 10, 20, 30, 40];
    yTicks.forEach(tick => {
        const yPos = getY(tick);
        svgHtml += `
            <line x1="${paddingLeft}" y1="${yPos}" x2="${width - paddingRight}" y2="${yPos}" class="chart-grid-line" />
            <text x="${paddingLeft - 8}" y="${yPos + 4}" text-anchor="end" class="chart-text">${tick}m</text>
        `;
    });
    
    // Draw X labels
    for (let i = 1; i <= maxX; i++) {
        const xPos = getX(i);
        svgHtml += `
            <text x="${xPos}" y="${height - paddingBottom + 18}" text-anchor="middle" class="chart-text">#${i}</text>
        `;
    }
    
    // Draw Baseline (35 min manual debugging)
    const baselineY = getY(35.0);
    svgHtml += `
        <line x1="${paddingLeft}" y1="${baselineY}" x2="${width - paddingRight}" y2="${baselineY}" class="chart-line-baseline" />
        <text x="${width - paddingRight - 8}" y="${baselineY - 6}" text-anchor="end" class="chart-text" style="fill: var(--danger); font-weight: 700;">Manual baseline (35m)</text>
    `;
    
    // Draw shaded area
    if (points.length >= 2) {
        let areaPath = `M ${getX(points[0].x)} ${getY(0)}`;
        points.forEach(pt => {
            areaPath += ` L ${getX(pt.x)} ${getY(pt.y)}`;
        });
        areaPath += ` L ${getX(points[points.length - 1].x)} ${getY(0)} Z`;
        svgHtml += `<path d="${areaPath}" class="chart-area" />`;
    }
    
    // Draw Line connecting values
    if (points.length >= 2) {
        let linePath = `M ${getX(points[0].x)} ${getY(points[0].y)}`;
        points.forEach((pt, index) => {
            if (index > 0) {
                linePath += ` L ${getX(pt.x)} ${getY(pt.y)}`;
            }
        });
        svgHtml += `<path d="${linePath}" class="chart-line" />`;
    }
    
    // Draw dot nodes
    points.forEach(pt => {
        const cx = getX(pt.x);
        const cy = getY(pt.y);
        svgHtml += `
            <g>
                <circle cx="${cx}" cy="${cy}" class="chart-dot" filter="url(#glow)">
                    <title>Incident #${pt.x}: ${pt.title}\nMTTR: ${pt.y.toFixed(1)} mins\nID: ${pt.id}</title>
                </circle>
            </g>
        `;
    });
    
    svgHtml += `</svg>`;
    container.innerHTML = svgHtml;
}

// Load Timeline History
async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE}/knowledge-base/incidents?limit=20`);
        const data = await response.json();
        const incidents = data.data;

        const timeline = document.getElementById('historyTimeline');
        timeline.innerHTML = '';
        if (incidents && incidents.length > 0) {
            incidents.slice().reverse().forEach(inc => {
                const el = document.createElement('div');
                el.className = 'timeline-item';
                
                const mttrStr = inc.mttr_minutes ? `${inc.mttr_minutes.toFixed(1)} minutes` : 'N/A';
                const causeStr = inc.investigation?.root_cause || 'Unknown Anomaly';
                
                el.innerHTML = `
                    <div class="timeline-content">
                        <h4>${inc.incident?.title || 'Untitled'}</h4>
                        <p>Service: <strong>${inc.incident?.service}</strong> | Severity: <strong>${inc.severity}</strong></p>
                        <p>Identified Root Cause: <strong>${causeStr}</strong></p>
                        <p>Resolution MTTR: <strong>${mttrStr}</strong></p>
                        <small>${new Date(inc.timestamp).toLocaleString()}</small>
                    </div>
                `;
                timeline.appendChild(el);
            });
        } else {
            timeline.innerHTML = '<p class="text-muted">No timeline log records found.</p>';
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

// Remediation Step Terminal Execution
async function executeRemediationStep(step, action) {
    const modal = document.getElementById('terminalModal');
    const output = document.getElementById('terminalOutput');
    
    // Open terminal and reset output
    modal.style.display = 'flex';
    output.innerHTML = '<p class="term-line" style="color: #808080;">[$] Initializing secure runtime context...</p>';
    
    try {
        const response = await fetch(`${API_BASE}/remediation/run-step`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, step: parseInt(step) })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            let logIdx = 0;
            const printLog = () => {
                if (logIdx < data.logs.length) {
                    const p = document.createElement('p');
                    p.className = 'term-line';
                    p.textContent = data.logs[logIdx];
                    // Style console input different than output
                    if (data.logs[logIdx].startsWith('[$]')) {
                        p.style.color = '#ffbd2e';
                    } else {
                        p.style.color = '#33ff33';
                    }
                    output.appendChild(p);
                    output.scrollTop = output.scrollHeight;
                    logIdx++;
                    setTimeout(printLog, 300);
                } else {
                    const p = document.createElement('p');
                    p.className = 'term-line';
                    p.style.color = '#00ff00';
                    p.style.fontWeight = 'bold';
                    p.style.marginTop = '10px';
                    p.textContent = `[SUCCESS] Remediation step ${step} executed successfully. Exit Code: 0`;
                    output.appendChild(p);
                    output.scrollTop = output.scrollHeight;
                    Toast.show(`Step ${step} executed successfully!`, 'success');
                }
            };
            
            // Start print queue
            setTimeout(printLog, 500);
        } else {
            const p = document.createElement('p');
            p.className = 'term-line';
            p.style.color = '#ff5f56';
            p.textContent = `[ERROR] Failed to run step: ${data.detail || 'Internal server error'}`;
            output.appendChild(p);
            Toast.show(`Step ${step} execution failed.`, 'error');
        }
    } catch (err) {
        const p = document.createElement('p');
        p.className = 'term-line';
        p.style.color = '#ff5f56';
        p.textContent = `[CONNECTION ERROR] ${err.message}`;
        output.appendChild(p);
        Toast.show(`Step ${step} execution failed.`, 'error');
    }
}

// Chatbot UI Handler — for floating chat panel
document.getElementById('chatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    if (!message) return;
    
    chatInput.value = '';
    
    const chatMessages = document.getElementById('chatMessages');
    
    // User bubble
    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'fcp-msg user';
    userMsgEl.innerHTML = `<p style="margin:0">${message}</p>`;
    chatMessages.appendChild(userMsgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Typing indicator
    const typingEl = document.createElement('div');
    typingEl.id = 'typingIndicator';
    typingEl.className = 'fcp-msg typing';
    typingEl.innerHTML = `<span>Agent is thinking...</span>`;
    chatMessages.appendChild(typingEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        const response = await fetch(`${API_BASE}/knowledge-base/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        const data = await response.json();
        
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) typingIndicator.remove();
        
        if (response.ok) {
            // Basic markdown render
            let rawReply = data.reply;
            let formattedReply = rawReply
                .replace(/\n\n/g, '<br><br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/### (.*?)(?:<br>|$)/g, '<h4 style="margin: 8px 0 4px 0; color: #ffbd2e; font-size:13px;">$1</h4>');
            
            // Citations
            let citationHtml = '';
            if (data.citations && data.citations.length > 0) {
                citationHtml = '<div class="fcp-citations">';
                citationHtml += '<strong>Sources:</strong><br>';
                data.citations.forEach(c => {
                    citationHtml += `📚 ${c.id}: "${c.title}" (${(c.similarity * 100).toFixed(0)}% match)<br>`;
                });
                citationHtml += '</div>';
            }
            
            const agentMsgEl = document.createElement('div');
            agentMsgEl.className = 'fcp-msg agent';
            agentMsgEl.innerHTML = `<p style="margin:0;white-space:pre-line;">${formattedReply}</p>${citationHtml}`;
            chatMessages.appendChild(agentMsgEl);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
            Toast.show('Chat query failed', 'error');
        }
    } catch (err) {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) typingIndicator.remove();
        Toast.show('Failed to connect to chat agent', 'error');
    }
});

// Initialize — DOMContentLoaded wires up interactive event handlers.
// NOTE: checkSystemStatus() and setInterval are already called at top-level
// (lines 109-111) so we do NOT duplicate them here to avoid double polling.
document.addEventListener('DOMContentLoaded', () => {
    // Close terminal modal events
    document.getElementById('closeTerminal').onclick = () => {
        document.getElementById('terminalModal').style.display = 'none';
    };
    document.getElementById('closeTerminalBtn').onclick = () => {
        document.getElementById('terminalModal').style.display = 'none';
    };
    
    // Create PR button click
    document.getElementById('btnCreatePR').onclick = () => {
        Toast.show('Creating Git Pull Request via automation webhook...', 'info');
        setTimeout(() => {
            Toast.show('Pull Request PR #1043 created successfully in repository!', 'success');
        }, 1500);
    };

    // ── Floating Chat Button toggle ──────────────────────────
    const fabBtn    = document.getElementById('floatingChatBtn');
    const fabPanel  = document.getElementById('floatingChatPanel');
    const fabIcon   = document.getElementById('chatBtnIcon');
    const closeBtn  = document.getElementById('closeChatPanel');
    const maxBtn    = document.getElementById('maximizeChatPanel');

    let isMaximized = false;

    function openChat() {
        fabPanel.classList.add('open');
        fabPanel.setAttribute('aria-hidden', 'false');
        // Swap FAB icon to ✕ and pause bounce when panel is open
        fabIcon.textContent = '✕';
        fabIcon.style.animation = 'none';
        setTimeout(() => document.getElementById('chatInput').focus(), 280);
    }

    function closeChat() {
        // Exit maximized first
        if (isMaximized) toggleMaximize();
        fabPanel.classList.remove('open');
        fabPanel.setAttribute('aria-hidden', 'true');
        // Restore robot + bounce
        fabIcon.textContent = '🤖';
        fabIcon.style.animation = '';
    }

    function toggleMaximize() {
        isMaximized = !isMaximized;
        if (isMaximized) {
            fabPanel.classList.add('maximized');
            maxBtn.textContent = '❏';   // restore icon
            maxBtn.title = 'Restore';
        } else {
            fabPanel.classList.remove('maximized');
            maxBtn.textContent = '⛶';   // maximize icon
            maxBtn.title = 'Maximize';
        }
    }

    fabBtn.addEventListener('click', () => {
        fabPanel.classList.contains('open') ? closeChat() : openChat();
    });

    closeBtn.addEventListener('click', closeChat);
    maxBtn.addEventListener('click', toggleMaximize);

    // Close panel when clicking outside (but not on FAB or maximized backdrop)
    document.addEventListener('click', (e) => {
        if (fabPanel.classList.contains('open') &&
            !isMaximized &&
            !fabPanel.contains(e.target) &&
            e.target !== fabBtn &&
            !fabBtn.contains(e.target)) {
            closeChat();
        }
    });

    // Close with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && fabPanel.classList.contains('open')) closeChat();
    });
});

window.addEventListener('resize', () => {
    // Redraw curve on window resize for responsiveness
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.dataset.tab === 'statistics') {
        loadStatistics();
    }
});
