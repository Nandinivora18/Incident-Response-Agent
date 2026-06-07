/**
 * 🎬 Live Demo Mode — "Watch the Agent Learn"
 * Fires 5 real incidents sequentially through the API and visualises
 * how MTTR drops as the knowledge base is applied.
 *
 * Incident selection:
 *   #1  MongoDB split-brain  → novel topic (no close KB match) → ~35 min
 *   #2  CoreDNS loop        → matches INC-2026-101            → ~2  min
 *   #3  Route53 TTL         → matches INC-2026-001            → ~2  min
 *   #4  etcd compaction     → matches INC-2026-102 family     → ~2  min
 *   #5  OOM eviction storm  → matches eviction incident       → ~2  min
 */

const DEMO_INCIDENTS = [
    {
        title: "MongoDB Replica Set Split-Brain Election Storm",
        severity: "critical",
        service: "mongodb",
        affected_services: ["api-service", "data-pipeline", "analytics"],
        description: "MongoDB replica set undergoing continuous primary election cycles causing full write unavailability. All write operations failing with NotMaster error. Secondary nodes unable to reach quorum during failover, with two nodes simultaneously claiming primary status.",
        logs: [
            "ERROR: NotMaster: not primary",
            "WARN: Election timeout exceeded 30s",
            "ERROR: ReplicaSetNoPrimary: no replica set primary available for writes"
        ]
    },
    {
        title: "Kubernetes CoreDNS Loop via systemd-resolved Overlap",
        severity: "high",
        service: "kubernetes-dns",
        affected_services: ["all-pods", "service-discovery"],
        description: "Newly provisioned Kubernetes node pool encountering infinite DNS forwarding loop within CoreDNS. Pods logging continuous 'Host not found' exceptions. CoreDNS pod logs filling with 'Loop network loop detected' emergency panics. Node resolv.conf pointing to 127.0.0.53 systemd-resolved loopback.",
        logs: [
            "EMERGENCY: Loop network loop detected on resolv.conf",
            "ERROR: Host not found: kubernetes.default.svc.cluster.local",
            "WARN: CoreDNS forwarding to upstream 127.0.0.53 which loops back"
        ]
    },
    {
        title: "AWS Route53 TTL Misconfiguration Cascading to API Gateway Unavailability",
        severity: "high",
        service: "api-gateway",
        affected_services: ["api-clients", "web-frontend", "mobile-app"],
        description: "Engineer updated Route53 DNS records with 48-hour TTL on a shifting backend alias instead of standard 60 seconds. API clients pinned to deprecated infrastructure during blue-green microservice migration. Spike in HTTP 503 errors globally.",
        logs: [
            "ERROR: HTTP 503 Service Unavailable from deprecated backend nodes",
            "WARN: Traffic asymmetry detected on new container fleet",
            "INFO: Route53 record set updated with TTL=172800"
        ]
    },
    {
        title: "etcd Database Compaction Failure Causing API Server Unavailability",
        severity: "high",
        service: "kubernetes-etcd",
        affected_services: ["kube-apiserver", "all-workloads", "cluster-autoscaler"],
        description: "Kubernetes etcd cluster disk usage exceeded 90% due to missed automated compaction. API server write requests timing out with 'mvcc: database space exceeded'. All deployments and scaling events halted. etcd disk quota: 2GB, current usage 1.85GB.",
        logs: [
            "ERROR: etcdserver: mvcc: database space exceeded",
            "ERROR: kube-apiserver: etcd cluster is unavailable",
            "WARN: etcd disk usage 91% of quota (1.85GB / 2GB)"
        ]
    },
    {
        title: "Kubernetes OOMKilled Pod Eviction Storm from Misconfigured Memory Thresholds",
        severity: "high",
        service: "kubernetes-nodes",
        affected_services: ["production-pods", "stateful-services", "ingress-controller"],
        description: "Kubelet eviction thresholds misconfigured with critically low memory.available=100Mi, triggering mass pod evictions across production nodes. Healthy pods prematurely evicted, causing cascading restarts and service outage across 12 production microservices.",
        logs: [
            "ERROR: OOMKilled: pod evicted due to memory pressure",
            "WARN: Eviction threshold exceeded: memory.available<100Mi",
            "ERROR: Failed to evict pod gracefully, force terminating"
        ]
    }
];

// ── State ─────────────────────────────────────────────────────
let demoRunning  = false;
let demoAborted  = false;
let demoResults  = [];
const BASELINE_MTTR = 35; // manual debugging baseline (minutes)

// ── Helpers ───────────────────────────────────────────────────
function animateStat(elId, newVal) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = newVal;
    el.classList.remove('stat-pop');
    void el.offsetWidth;           // force reflow to restart animation
    el.classList.add('stat-pop');
}

function addDemoBar(mttr, index) {
    const container = document.getElementById('demoMttrBars');
    if (!container) return;
    const isFast = mttr < 10;
    const heightPx = Math.max(4, Math.round((mttr / BASELINE_MTTR) * 64));
    const col = document.createElement('div');
    col.className = 'demo-bar-col';
    col.innerHTML = `
        <div class="demo-bar-num ${isFast ? 'fast' : 'slow'}">${mttr.toFixed(1)}m</div>
        <div class="demo-bar ${isFast ? 'fast' : 'slow'}" style="height:0"></div>
        <div class="demo-bar-label">#${index + 1}</div>
    `;
    container.appendChild(col);
    // Animate height after the element is painted
    requestAnimationFrame(() => setTimeout(() => {
        col.querySelector('.demo-bar').style.height = heightPx + 'px';
    }, 60));
}

function renderQueueItem(inc, index, status, mttr) {
    const list = document.getElementById('demoIncidentList');
    const existing = document.getElementById(`dq-item-${index}`);
    const mttrHtml = mttr !== null
        ? `<div class="demo-q-mttr ${mttr < 10 ? 'fast' : ''}">⏱ ${mttr.toFixed(1)} min</div>`
        : '';
    const inner = `
        <div class="dq-dot ${status}"></div>
        <div>
            <div class="demo-q-title">${inc.title}</div>
            ${mttrHtml}
        </div>`;
    if (existing) {
        existing.className = `demo-q-item ${status}`;
        existing.innerHTML = inner;
    } else {
        const el = document.createElement('div');
        el.id = `dq-item-${index}`;
        el.className = `demo-q-item pending`;
        el.innerHTML = inner;
        list.appendChild(el);
        // Small delay so items appear one by one
        el.style.opacity = '0';
        el.style.transform = 'translateX(-10px)';
        el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateX(0)';
            el.className = `demo-q-item ${status}`;
        }, index * 120);
    }
}

function showCurrentCard_Investigating(inc) {
    document.getElementById('demoCurrentCard').innerHTML = `
        <h3 class="demo-inc-title">${inc.title}</h3>
        <div class="demo-inc-meta">
            <span class="demo-inc-badge sev-${inc.severity}">${inc.severity.toUpperCase()}</span>
            <span class="demo-inc-badge" style="background:rgba(139,92,246,0.15);color:#a78bfa;border:1px solid rgba(139,92,246,0.3)">${inc.service}</span>
        </div>
        <p class="demo-inc-desc">${inc.description}</p>
        <div class="demo-investigating">
            <div class="demo-spin"></div>
            <span>7-phase multi-agent investigation — searching KB for similar incidents, analysing logs &amp; metrics, synthesising root cause…</span>
        </div>`;
}

function showCurrentCard_Result(inc, result) {
    const mttr    = result.mttr_minutes ?? result.duration_minutes ?? BASELINE_MTTR;
    const isFast  = mttr < 10;
    const learning = Array.isArray(result.learning_applied) ? result.learning_applied : [];
    const reused  = learning.length > 0 && !learning[0].includes('No previous');
    const conf    = ((result.root_cause_confidence ?? 0.5) * 100).toFixed(0);
    const action  = (result.solution?.immediate_action ?? 'Review metrics and logs').slice(0, 90);

    document.getElementById('demoCurrentCard').innerHTML = `
        <h3 class="demo-inc-title">${inc.title}</h3>
        <div class="demo-inc-meta">
            <span class="demo-inc-badge sev-${inc.severity}">${inc.severity.toUpperCase()}</span>
            <span class="demo-inc-badge" style="background:rgba(139,92,246,0.15);color:#a78bfa;border:1px solid rgba(139,92,246,0.3)">${inc.service}</span>
            ${reused
                ? '<span class="demo-reuse-badge">🧠 Historical KB Match — Knowledge Reused</span>'
                : '<span class="demo-new-badge">🆕 Novel Incident — Stored in KB</span>'}
        </div>
        <p class="demo-inc-desc">${inc.description}</p>
        <div class="demo-inc-result">
            <div class="demo-result-row">
                <span class="demo-result-label">🎯 Root Cause</span>
                <span class="demo-result-val" style="max-width:60%;text-align:right;font-size:13px">${result.root_cause ?? 'Unknown'}</span>
            </div>
            <div class="demo-result-row">
                <span class="demo-result-label">📊 Confidence</span>
                <span class="demo-result-val">${conf}%</span>
            </div>
            <div class="demo-result-row">
                <span class="demo-result-label">⏱️ MTTR</span>
                <span class="demo-result-val ${isFast ? 'mttr-fast' : 'mttr-slow'}">${mttr.toFixed(1)} min${isFast ? ' ⚡' : ''}</span>
            </div>
            <div class="demo-result-row">
                <span class="demo-result-label">💡 Immediate Action</span>
                <span class="demo-result-val" style="font-size:12px;max-width:56%;text-align:right">${action}…</span>
            </div>
        </div>`;
}

// ── Main demo runner ──────────────────────────────────────────
async function runLiveDemo() {
    if (demoRunning) return;
    demoRunning = true;
    demoAborted = false;
    demoResults = [];

    // Reset all elements
    document.getElementById('demoIncidentList').innerHTML   = '';
    document.getElementById('demoMttrBars').innerHTML       = '';
    document.getElementById('demoSummaryBanner').style.display = 'none';
    document.getElementById('demoProgressFill').style.width = '0%';
    document.getElementById('demoProgressBar').style.display = 'block';
    document.getElementById('startDemoBtn').style.display   = 'none';
    document.getElementById('resetDemoBtn').style.display   = 'none';
    document.getElementById('demoCurrentCard').innerHTML    = `
        <div class="demo-current-placeholder">
            <span style="font-size:40px">🤖</span>
            <p>Preparing incident queue…</p>
        </div>`;
    animateStat('demoKbCount',    '66');
    animateStat('demoMttrNow',    '—');
    animateStat('demoSaved',       '0');
    animateStat('demoReuseCount', '0 / 5');
    animateStat('demoProgress',   '0 / 5');

    // Pre-populate queue (pending)
    DEMO_INCIDENTS.forEach((inc, i) => renderQueueItem(inc, i, 'pending', null));
    await sleep(900);

    let totalSaved = 0;
    let reuseCount = 0;

    for (let i = 0; i < DEMO_INCIDENTS.length; i++) {
        if (demoAborted) break;
        const inc = DEMO_INCIDENTS[i];

        // Mark as running
        renderQueueItem(inc, i, 'running', null);
        showCurrentCard_Investigating(inc);
        document.getElementById('demoProgressFill').style.width =
            `${(i / DEMO_INCIDENTS.length) * 100}%`;

        // ── Fetch result from real API ──
        let result = null;
        try {
            const resp = await fetch('/api/investigate', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(inc)
            });
            if (resp.ok) {
                const body = await resp.json();
                result = body.data ?? body;      // handle both wrapper shapes
            }
        } catch (err) {
            console.warn('[Demo] API error for incident', i, err);
        }

        // Fallback if API call failed
        if (!result) {
            result = {
                root_cause: 'Investigation error (API unreachable)',
                root_cause_confidence: 0.4,
                mttr_minutes: BASELINE_MTTR,
                solution: { immediate_action: 'Check server connectivity' },
                learning_applied: []
            };
        }

        const mttr = result.mttr_minutes ?? result.duration_minutes ?? BASELINE_MTTR;
        demoResults.push({ inc, result, mttr });

        // ── Update live stats ──
        const kbNow = 66 + i + 1;
        animateStat('demoKbCount', kbNow.toString());
        animateStat('demoMttrNow', `${mttr.toFixed(1)}m`);

        const saved = Math.max(0, BASELINE_MTTR - mttr);
        totalSaved += saved;
        animateStat('demoSaved', Math.round(totalSaved).toString());

        const learning = Array.isArray(result.learning_applied) ? result.learning_applied : [];
        const reused   = learning.length > 0 && !learning[0].includes('No previous');
        if (reused) reuseCount++;
        animateStat('demoReuseCount', `${reuseCount} / 5`);
        animateStat('demoProgress',   `${i + 1} / 5`);

        // ── Update UI ──
        renderQueueItem(inc, i, 'done', mttr);
        showCurrentCard_Result(inc, result);
        addDemoBar(mttr, i);

        // Pause so judges can read before next incident fires
        if (i < DEMO_INCIDENTS.length - 1) await sleep(2500);
    }

    // ── Completion ──
    document.getElementById('demoProgressFill').style.width = '100%';

    if (!demoAborted) {
        const pctReduction = Math.round(
            (totalSaved / (BASELINE_MTTR * DEMO_INCIDENTS.length)) * 100
        );
        document.getElementById('demoFinalSaved').textContent = Math.round(totalSaved);
        document.getElementById('demoFinalPct').textContent   = `${pctReduction}%`;
        document.getElementById('demoSummaryBanner').style.display = 'block';

        if (typeof Toast !== 'undefined') {
            Toast.show(
                `🏆 Demo complete! ${Math.round(totalSaved)} min saved — ${pctReduction}% MTTR reduction`,
                'success', 7000
            );
        }
    }

    document.getElementById('resetDemoBtn').style.display = 'inline-flex';
    demoRunning = false;
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ── Overlay open / close ──────────────────────────────────────
function openDemoOverlay() {
    const overlay = document.getElementById('demoOverlay');
    overlay.style.display = 'flex';
    // Reset for fresh open
    document.getElementById('startDemoBtn').style.display  = 'inline-flex';
    document.getElementById('resetDemoBtn').style.display  = 'none';
    document.getElementById('demoProgressBar').style.display = 'none';
}

function closeDemoOverlay() {
    demoAborted = true;
    demoRunning = false;
    document.getElementById('demoOverlay').style.display = 'none';
}

// ── Wire up buttons once DOM is ready ────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('liveDemoBtn')?.addEventListener('click', openDemoOverlay);
    document.getElementById('closeDemoBtn')?.addEventListener('click', closeDemoOverlay);

    document.getElementById('startDemoBtn')?.addEventListener('click', () => {
        runLiveDemo();
    });

    document.getElementById('resetDemoBtn')?.addEventListener('click', () => {
        demoRunning = false;
        demoAborted = false;
        // Reset queue display and stats then re-run
        document.getElementById('resetDemoBtn').style.display = 'none';
        document.getElementById('startDemoBtn').style.display = 'inline-flex';
        document.getElementById('demoProgressBar').style.display = 'none';
        document.getElementById('demoProgressFill').style.width = '0%';
        document.getElementById('demoSummaryBanner').style.display = 'none';
        document.getElementById('demoIncidentList').innerHTML = '';
        document.getElementById('demoMttrBars').innerHTML = '';
        document.getElementById('demoCurrentCard').innerHTML = `
            <div class="demo-current-placeholder">
                <span style="font-size:40px">🤖</span>
                <p>Click <strong>Start Demo</strong> to begin the live simulation</p>
            </div>`;
        animateStat('demoKbCount',    '66');
        animateStat('demoMttrNow',    '—');
        animateStat('demoSaved',       '0');
        animateStat('demoReuseCount', '0 / 5');
        animateStat('demoProgress',   '0 / 5');
    });

    // Close overlay on backdrop click
    document.getElementById('demoOverlay')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('demoOverlay')) closeDemoOverlay();
    });

    // Escape key closes demo
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('demoOverlay')?.style.display === 'flex') {
            closeDemoOverlay();
        }
    });
});
