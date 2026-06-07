/**
 * 🎬 GUIDED LIVE DEMO TOUR
 * Walks judges through every feature of the app in sequence:
 *   Header → Tabs → Form (typewriter) → Investigation → Results →
 *   Knowledge Base → Statistics → History → AI Chatbot → Summary
 *
 * Controls:
 *   [▶ Next]  – advance manually
 *   [⏸ Pause] – pause auto-advance
 *   [✕ Exit]  – close tour
 *   Spotlight follows the active UI element
 */

// ── Tour Steps ────────────────────────────────────────────────
const TOUR_STEPS = [
    {
        id: 'welcome',
        title: '🎬 Welcome to Incident Response Agent',
        narration: 'An AI multi-agent system that remembers every past incident and automatically resolves future ones. This live demo walks you through every feature — no setup required.',
        target: null,   // centred welcome card, no spotlight
        duration: 4500,
        action: null
    },
    {
        id: 'header',
        title: '🚨 Live System Status',
        narration: 'The header shows real-time health of all 7 specialized agents and the knowledge base. The green pulse means everything is operational.',
        target: '.header',
        duration: 3500,
        action: null
    },
    {
        id: 'tabs',
        title: '📋 Four Core Modules',
        narration: 'Investigate — submit any incident for AI analysis. Knowledge Base — browse 66+ historical incidents. Statistics — view the MTTR learning curve. History — audit trail of all investigations.',
        target: '.tabs-nav',
        duration: 4000,
        action: null
    },
    {
        id: 'investigate-tab',
        title: '🔍 Incident Investigation',
        narration: 'The investigation form submits any production incident to 7 concurrent AI agents. Fill in the details and the orchestrator takes over.',
        target: '#investigate .section-header',
        duration: 3000,
        action: () => safeSwitchTab('investigate')
    },
    {
        id: 'form-fill',
        title: '✍️ Real-world Incident: CoreDNS Loop',
        narration: 'Filling in a real Kubernetes DNS failure. The agent will search 66 historical incidents, find a match, and resolve it in under 2 minutes vs 35-minute manual debugging.',
        target: '#incidentForm',
        duration: 9500,
        action: 'fillForm'
    },
    {
        id: 'submit-btn',
        title: '▶️ Starting Multi-Agent Investigation',
        narration: 'All 7 agents activate simultaneously — Kubernetes, Cloud, Metrics, Log Analysis, Code Analysis, and the Historical Learning agent scanning the knowledge base for similar patterns.',
        target: '#submitBtn',
        duration: 2500,
        action: 'submitForm'
    },
    {
        id: 'investigation-running',
        title: '⚡ 7-Phase Investigation in Progress',
        narration: 'Phase 1: Knowledge retrieval → Phase 2: Assessment → Phase 3: Deep investigation → Phase 4: Root cause analysis → Phase 5: Solution generation → Phase 6: Remediation plan → Phase 7: Learning storage.',
        target: '.investigation-section, #investigationSection, #result, .tab-content.active',
        duration: 18000,  // wait for real API result
        action: 'waitForResults'
    },
    {
        id: 'results-root-cause',
        title: '🎯 Root Cause Identified with Confidence Score',
        narration: 'The agent matched this incident to INC-2026-101 in the knowledge base (CoreDNS loop via systemd-resolved). MTTR dropped from 35 min → 2 min — a 94% reduction.',
        target: '#investigationResults, #result',
        duration: 4500,
        action: 'scrollToResults'
    },
    {
        id: 'results-remediation',
        title: '🛠️ Priority-Graded Remediation Plan',
        narration: 'Each remediation step comes with a priority level (Critical/High/Medium) and an estimated time. Click any step to open the interactive terminal shell and execute it.',
        target: '#investigationResults, #result',
        duration: 4000,
        action: null
    },
    {
        id: 'knowledge-base',
        title: '📚 Knowledge Base — 66 Real Incidents',
        narration: 'Pre-seeded with 66 real-world incidents across Kubernetes, Networking, Database, Security, Cloud, and CI/CD. Every investigation grows this library automatically.',
        target: '#knowledge',
        duration: 4000,
        action: () => {
            safeSwitchTab('knowledge');
            if (typeof loadKnowledgeBase === 'function') loadKnowledgeBase();
        }
    },
    {
        id: 'statistics',
        title: '📊 MTTR Learning Curve Chart',
        narration: 'The chart is the core proof: as the knowledge base grows, MTTR drops from 35 minutes to under 2. The agent genuinely gets smarter with every incident it sees.',
        target: '#statistics',
        duration: 4500,
        action: () => {
            safeSwitchTab('statistics');
            if (typeof loadStatistics === 'function') loadStatistics();
        }
    },
    {
        id: 'history',
        title: '📋 Complete Investigation History',
        narration: 'Full audit trail of every incident investigated — timestamps, root causes, MTTR values, and which historical incidents were referenced for the solution.',
        target: '#history',
        duration: 3500,
        action: () => {
            safeSwitchTab('history');
            if (typeof loadHistory === 'function') loadHistory();
        }
    },
    {
        id: 'chatbot-open',
        title: '🤖 AI Knowledge Assistant (RAG Chatbot)',
        narration: 'The floating robot in the bottom-right is a RAG-powered assistant. Ask it anything about past incidents, root causes, or resolutions — it searches the KB and cites sources.',
        target: '#floatingChatBtn',
        duration: 3500,
        action: 'openChatbot'
    },
    {
        id: 'chatbot-query',
        title: '💬 Querying: "How to fix CoreDNS loop?"',
        narration: 'The assistant searches the knowledge base using semantic similarity and returns an answer with source citations from matching historical incidents.',
        target: '#floatingChatPanel',
        duration: 9000,
        action: 'sendChatMessage'
    },
    {
        id: 'webhook',
        title: '🔔 Webhook Ingestion — Alertmanager & Datadog',
        narration: 'Production alerts from Alertmanager, Datadog, or any monitoring tool can be sent to /api/webhooks/alerts and automatically trigger a background investigation.',
        target: '.header',
        duration: 4000,
        action: 'showWebhookToast'
    },
    {
        id: 'complete',
        title: '🏆 Demo Complete — Team Secureonix',
        narration: '94% MTTR reduction • 66 incident knowledge base • 7 specialized AI agents • 12 REST API endpoints • RAG chatbot with citations • Webhook ingestion • Interactive runbooks • Real-time learning.',
        target: null,
        duration: 6000,
        action: null
    }
];

// ── State ─────────────────────────────────────────────────────
let tourActive    = false;
let tourPaused    = false;
let tourStepIdx   = 0;
let tourTimer     = null;
let formFilled    = false;
let resultsFound  = false;
let chatOpened    = false;

// ── Spotlight overlay (4-panel technique) ─────────────────────
function buildSpotlightHTML() {
    return `
        <div id="tourOverlayTop"    class="tour-overlay-segment"></div>
        <div id="tourOverlayBottom" class="tour-overlay-segment"></div>
        <div id="tourOverlayLeft"   class="tour-overlay-segment"></div>
        <div id="tourOverlayRight"  class="tour-overlay-segment"></div>
        <div id="tourTooltip"       class="tour-tooltip" style="display:none"></div>
        <div id="tourWelcomeCard"   class="tour-welcome-card" style="display:none"></div>
        <div id="tourControls"      class="tour-controls">
            <div class="tour-ctrl-left">
                <button id="tourExitBtn"  class="tour-ctrl-btn exit">✕ Exit Demo</button>
            </div>
            <div class="tour-ctrl-center">
                <span id="tourStepLabel" class="tour-step-label">Step 1 / ${TOUR_STEPS.length}</span>
                <div id="tourDots" class="tour-dots"></div>
            </div>
            <div class="tour-ctrl-right">
                <button id="tourPauseBtn" class="tour-ctrl-btn pause">⏸ Pause</button>
                <button id="tourNextBtn"  class="tour-ctrl-btn next">▶ Next</button>
            </div>
        </div>`;
}

function mountTourDOM() {
    if (document.getElementById('tourControls')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'tourWrapper';
    wrapper.innerHTML = buildSpotlightHTML();
    document.body.appendChild(wrapper);

    // Build step dots
    const dots = document.getElementById('tourDots');
    TOUR_STEPS.forEach((_, i) => {
        const d = document.createElement('span');
        d.className = 'tour-dot';
        d.id = `tour-dot-${i}`;
        dots.appendChild(d);
    });

    document.getElementById('tourExitBtn').onclick  = stopTour;
    document.getElementById('tourPauseBtn').onclick = togglePauseTour;
    document.getElementById('tourNextBtn').onclick  = () => advanceTour(true);
}

function setSpotlight(el) {
    if (!el) {
        // No spotlight — hide segments, show welcome/complete card centred
        ['tourOverlayTop','tourOverlayBottom','tourOverlayLeft','tourOverlayRight'].forEach(id => {
            const seg = document.getElementById(id);
            if (seg) { seg.style.background = 'rgba(0,0,0,0.78)'; seg.style.inset = id === 'tourOverlayTop' ? '0' : '200vh 200vw'; }
        });
        const top = document.getElementById('tourOverlayTop');
        if (top) { top.style.inset = '0'; top.style.bottom = '0'; }
        ['tourOverlayBottom','tourOverlayLeft','tourOverlayRight'].forEach(id => {
            const s = document.getElementById(id);
            if (s) { s.style.width = '0'; s.style.height = '0'; s.style.top = '0'; s.style.left = '0'; }
        });
        const tt = document.getElementById('tourTooltip');
        if (tt) tt.style.display = 'none';
        return;
    }

    const rect = el.getBoundingClientRect();
    const pad  = 8;
    const top    = Math.max(0, rect.top - pad);
    const left   = Math.max(0, rect.left - pad);
    const bottom = Math.min(window.innerHeight, rect.bottom + pad);
    const right  = Math.min(window.innerWidth,  rect.right + pad);

    const S = {
        top:    document.getElementById('tourOverlayTop'),
        bottom: document.getElementById('tourOverlayBottom'),
        left:   document.getElementById('tourOverlayLeft'),
        right:  document.getElementById('tourOverlayRight')
    };

    if (S.top)    { S.top.style.cssText    = `position:fixed;inset:0 0 auto 0;height:${top}px;background:rgba(0,0,0,0.72);z-index:10500;pointer-events:none;transition:all .4s ease;`; }
    if (S.bottom) { S.bottom.style.cssText = `position:fixed;top:${bottom}px;left:0;right:0;bottom:0;background:rgba(0,0,0,0.72);z-index:10500;pointer-events:none;transition:all .4s ease;`; }
    if (S.left)   { S.left.style.cssText   = `position:fixed;top:${top}px;left:0;width:${left}px;height:${bottom-top}px;background:rgba(0,0,0,0.72);z-index:10500;pointer-events:none;transition:all .4s ease;`; }
    if (S.right)  { S.right.style.cssText  = `position:fixed;top:${top}px;left:${right}px;right:0;height:${bottom-top}px;background:rgba(0,0,0,0.72);z-index:10500;pointer-events:none;transition:all .4s ease;`; }

    // Position tooltip
    positionTooltip(top, left, bottom, right);
}

function positionTooltip(top, left, bottom, right) {
    const tt = document.getElementById('tourTooltip');
    if (!tt) return;
    const step = TOUR_STEPS[tourStepIdx];
    tt.style.display = 'block';
    tt.innerHTML = `
        <div class="tour-tt-step">Step ${tourStepIdx + 1} of ${TOUR_STEPS.length}</div>
        <div class="tour-tt-title">${step.title}</div>
        <div class="tour-tt-narration">${step.narration}</div>
        <div class="tour-tt-progress">
            <div class="tour-tt-fill" id="tourTtFill"></div>
        </div>`;

    // Place tooltip below or above the spotlight
    const ttH = 140;
    const ttW = 360;
    let ttTop, ttLeft;

    if (bottom + ttH + 16 < window.innerHeight - 60) {
        ttTop = bottom + 12;
    } else {
        ttTop = top - ttH - 12;
    }
    ttLeft = Math.max(12, Math.min(left, window.innerWidth - ttW - 12));

    tt.style.top  = `${Math.max(8, ttTop)}px`;
    tt.style.left = `${ttLeft}px`;
    tt.style.width = `${ttW}px`;
}

function showWelcomeCard(step) {
    const card = document.getElementById('tourWelcomeCard');
    if (!card) return;
    card.style.display = 'flex';
    card.innerHTML = `
        <div class="twc-inner">
            <div class="twc-emoji">${step.id === 'complete' ? '🏆' : '🎬'}</div>
            <h2 class="twc-title">${step.title}</h2>
            <p class="twc-narration">${step.narration}</p>
            ${step.id === 'complete' ? `
            <div class="twc-stats">
                <div class="twc-stat"><strong>94%</strong><span>MTTR Reduction</span></div>
                <div class="twc-stat"><strong>66</strong><span>KB Incidents</span></div>
                <div class="twc-stat"><strong>7</strong><span>AI Agents</span></div>
                <div class="twc-stat"><strong>12</strong><span>API Endpoints</span></div>
            </div>` : `<div class="twc-hint">Demo auto-advances • Click ▶ Next to skip</div>`}
        </div>`;
    const tt = document.getElementById('tourTooltip');
    if (tt) tt.style.display = 'none';
}

function hideWelcomeCard() {
    const card = document.getElementById('tourWelcomeCard');
    if (card) card.style.display = 'none';
}

// ── Step Execution ────────────────────────────────────────────
async function executeStep(step) {
    // Dots
    document.querySelectorAll('.tour-dot').forEach((d, i) => {
        d.className = 'tour-dot' + (i < tourStepIdx ? ' done' : i === tourStepIdx ? ' active' : '');
    });
    document.getElementById('tourStepLabel').textContent =
        `Step ${tourStepIdx + 1} / ${TOUR_STEPS.length} — ${step.title.replace(/^[^\s]+\s/, '')}`;

    // Resolve target element
    let targetEl = null;
    if (step.target) {
        const selectors = step.target.split(',').map(s => s.trim());
        for (const sel of selectors) {
            targetEl = document.querySelector(sel);
            if (targetEl && targetEl.offsetHeight > 0) break;
        }
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(400);
        }
    }

    // Show spotlight or welcome card
    if (!step.target) {
        setSpotlight(null);
        showWelcomeCard(step);
    } else {
        hideWelcomeCard();
        setSpotlight(targetEl);
    }

    // Run action
    if (typeof step.action === 'function') {
        await step.action();
    } else if (step.action === 'fillForm') {
        await doFillForm();
    } else if (step.action === 'submitForm') {
        await doSubmitForm();
    } else if (step.action === 'waitForResults') {
        await doWaitForResults(step.duration);
        return; // waitForResults handles its own advance
    } else if (step.action === 'scrollToResults') {
        doScrollToResults();
    } else if (step.action === 'openChatbot') {
        doOpenChatbot();
    } else if (step.action === 'sendChatMessage') {
        await doSendChatMessage();
    } else if (step.action === 'showWebhookToast') {
        doShowWebhookToast();
    }

    // Auto-advance timer (unless this step manages its own timing)
    if (!tourPaused) {
        startStepTimer(step.duration);
    }
}

function startStepTimer(duration) {
    clearTimeout(tourTimer);
    // Animate tooltip progress bar
    const fill = document.getElementById('tourTtFill');
    if (fill) {
        fill.style.transition = 'none';
        fill.style.width = '0%';
        requestAnimationFrame(() => {
            fill.style.transition = `width ${duration}ms linear`;
            fill.style.width = '100%';
        });
    }
    tourTimer = setTimeout(() => advanceTour(false), duration);
}

async function advanceTour(manual) {
    if (!tourActive) return;
    clearTimeout(tourTimer);
    tourStepIdx++;
    if (tourStepIdx >= TOUR_STEPS.length) {
        stopTour();
        return;
    }
    await executeStep(TOUR_STEPS[tourStepIdx]);
}

function togglePauseTour() {
    tourPaused = !tourPaused;
    const btn = document.getElementById('tourPauseBtn');
    if (tourPaused) {
        clearTimeout(tourTimer);
        btn.textContent = '▶ Resume';
        btn.classList.add('paused');
        const fill = document.getElementById('tourTtFill');
        if (fill) fill.style.transition = 'none'; // freeze progress bar
    } else {
        btn.textContent = '⏸ Pause';
        btn.classList.remove('paused');
        startStepTimer(TOUR_STEPS[tourStepIdx]?.duration || 4000);
    }
}

// ── Form fill (typewriter) ────────────────────────────────────
const DEMO_INCIDENT = {
    title:       'Kubernetes CoreDNS Loop via systemd-resolved',
    severity:    'high',
    service:     'kubernetes-dns',
    affected:    'all-pods, service-discovery, ingress',
    description: 'Newly provisioned Kubernetes node pool encountering infinite DNS forwarding loop within CoreDNS. Pods logging continuous Host not found exceptions. CoreDNS pods filling logs with Loop network loop detected emergency panics.',
    logs:        '["EMERGENCY: Loop network loop detected", "ERROR: Host not found: kubernetes.default.svc.cluster.local", "WARN: CoreDNS forwarding to 127.0.0.53 loops back"]'
};

async function typeInto(el, text, speed = 28) {
    if (!el) return;
    el.focus();
    el.value = '';
    el.dispatchEvent(new Event('input'));
    for (const ch of text) {
        if (!tourActive) return;
        el.value += ch;
        el.dispatchEvent(new Event('input'));
        await sleep(speed + Math.random() * 15);
    }
}

async function doFillForm() {
    formFilled = false;
    // Switch to investigate tab first
    safeSwitchTab('investigate');
    await sleep(600);

    // Highlight the form
    const form = document.getElementById('incidentForm') || document.querySelector('#investigate form');
    if (!form) return;
    setSpotlight(form);

    await typeInto(document.getElementById('title')       || document.querySelector('[name="title"]'),       DEMO_INCIDENT.title, 35);
    await sleep(200);

    const sevEl = document.getElementById('severity') || document.querySelector('#severity, [name="severity"]');
    if (sevEl) { sevEl.value = DEMO_INCIDENT.severity; sevEl.dispatchEvent(new Event('change')); }
    await sleep(300);

    await typeInto(document.getElementById('service')     || document.querySelector('[name="service"]'),      DEMO_INCIDENT.service, 40);
    await sleep(200);
    await typeInto(document.getElementById('affected_services') || document.querySelector('[name="affected_services"]'), DEMO_INCIDENT.affected, 30);
    await sleep(200);
    await typeInto(document.getElementById('description') || document.querySelector('[name="description"], textarea'), DEMO_INCIDENT.description, 18);
    await sleep(200);
    await typeInto(document.getElementById('logs')        || document.querySelector('[name="logs"]'),         DEMO_INCIDENT.logs, 22);

    formFilled = true;
}

async function doSubmitForm() {
    const btn = document.getElementById('submitBtn') ||
                document.querySelector('#incidentForm button[type="submit"], button.btn-primary');
    if (!btn) return;

    // Flash the button
    btn.style.transform = 'scale(1.05)';
    btn.style.boxShadow = '0 0 24px rgba(139,92,246,0.7)';
    await sleep(400);
    btn.style.transform = '';
    btn.style.boxShadow = '';

    if (formFilled) {
        btn.click();
    }
    resultsFound = false;
}

async function doWaitForResults(maxDuration) {
    const start = Date.now();
    const limit = maxDuration || 20000;

    while (Date.now() - start < limit) {
        if (!tourActive) return;
        // Try to find results container
        const resultEl = document.getElementById('investigationResults') ||
                         document.getElementById('result') ||
                         document.querySelector('.investigation-result, .result-card');
        if (resultEl && resultEl.offsetHeight > 10) {
            resultsFound = true;
            break;
        }
        await sleep(800);
    }

    // Re-spotlight results if found, else continue
    const resultEl = document.getElementById('investigationResults') ||
                     document.getElementById('result') ||
                     document.querySelector('.investigation-result, .result-section');
    if (resultEl) {
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        await sleep(600);
        setSpotlight(resultEl);
    }

    startStepTimer(2000);
    await sleep(2200);
    advanceTour(false);
}

function doScrollToResults() {
    const resultEl = document.getElementById('investigationResults') ||
                     document.getElementById('result') ||
                     document.querySelector('.investigation-result, .result-section');
    if (resultEl) {
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => setSpotlight(resultEl), 500);
    }
}

function doOpenChatbot() {
    const fabBtn = document.getElementById('floatingChatBtn');
    if (fabBtn && document.getElementById('floatingChatPanel')?.classList.contains('open') === false) {
        fabBtn.click();
        chatOpened = true;
    }
    // Spotlight the panel
    setTimeout(() => {
        const panel = document.getElementById('floatingChatPanel');
        if (panel) setSpotlight(panel);
    }, 500);
}

async function doSendChatMessage() {
    // Ensure chatbot is open
    const panel = document.getElementById('floatingChatPanel');
    if (!panel?.classList.contains('open')) {
        document.getElementById('floatingChatBtn')?.click();
        await sleep(500);
    }

    const input = document.getElementById('chatInput');
    if (!input) return;

    setSpotlight(panel || document.getElementById('floatingChatPanel'));
    await sleep(400);

    const question = 'How do we resolve a CoreDNS loop in Kubernetes?';
    await typeInto(input, question, 45);
    await sleep(500);

    const form = document.getElementById('chatForm');
    if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

function doShowWebhookToast() {
    if (typeof Toast !== 'undefined') {
        Toast.show('📡 Webhook received from Alertmanager — auto-triggering background investigation...', 'info', 4500);
        setTimeout(() => Toast.show('✅ Webhook investigation queued: HighMemoryUsage alert auto-analysed', 'success', 4000), 2000);
    }
    safeSwitchTab('investigate');
    setTimeout(() => setSpotlight(document.querySelector('.header-status, .header')), 400);
}

// ── Tour lifecycle ────────────────────────────────────────────
async function startGuidedTour() {
    if (tourActive) return;
    tourActive   = true;
    tourPaused   = false;
    tourStepIdx  = 0;
    formFilled   = false;
    resultsFound = false;
    chatOpened   = false;

    mountTourDOM();
    showTourControls();
    document.getElementById('demoOverlay').style.display = 'none'; // close old demo overlay if open

    await executeStep(TOUR_STEPS[0]);
}

function stopTour() {
    tourActive = false;
    clearTimeout(tourTimer);

    // Remove overlay segments
    ['tourOverlayTop','tourOverlayBottom','tourOverlayLeft','tourOverlayRight'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.height = '0';
    });

    // Clean up
    const wrapper = document.getElementById('tourWrapper');
    if (wrapper) {
        wrapper.style.opacity = '0';
        wrapper.style.transition = 'opacity 0.4s';
        setTimeout(() => wrapper.remove(), 420);
    }

    // Close chatbot if we opened it
    if (chatOpened) {
        const fabPanel = document.getElementById('floatingChatPanel');
        if (fabPanel?.classList.contains('open')) {
            document.getElementById('floatingChatBtn')?.click();
        }
    }
}

function showTourControls() {
    const ctrls = document.getElementById('tourControls');
    if (ctrls) {
        ctrls.style.display = 'flex';
        ctrls.style.opacity = '0';
        setTimeout(() => ctrls.style.opacity = '1', 100);
    }
}

// ── Utility ───────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function safeSwitchTab(name) {
    // Try the app's own switchTab function first
    if (typeof switchTab === 'function') {
        switchTab(name);
        return;
    }
    // Fallback: click the tab button
    const btn = document.querySelector(`.tab-btn[data-tab="${name}"]`);
    if (btn) btn.click();
}

// ── Wire up demo launch button ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // The existing "🎦 Live Demo" button now launches the guided tour
    document.getElementById('liveDemoBtn')?.addEventListener('click', () => {
        // Close old-style demo overlay if open
        document.getElementById('demoOverlay').style.display = 'none';
        startGuidedTour();
    });

    // Keep old demo overlay close button working
    document.getElementById('closeDemoBtn')?.addEventListener('click', () => {
        document.getElementById('demoOverlay').style.display = 'none';
    });
    document.getElementById('startDemoBtn')?.addEventListener('click', () => {
        document.getElementById('demoOverlay').style.display = 'none';
        startGuidedTour();
    });
    document.getElementById('resetDemoBtn')?.addEventListener('click', () => {
        document.getElementById('demoOverlay').style.display = 'none';
        startGuidedTour();
    });
});
