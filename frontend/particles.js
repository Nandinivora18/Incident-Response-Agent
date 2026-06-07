/**
 * 🌐 3D Agent Network Particle Background
 * Canvas-based animation showing all 7 agents as glowing nodes
 * connected by animated dashed lines with traveling data packets.
 *
 * Architecture visualised:
 *   Orchestrator (center hub) ←→ 6 specialist agents arranged around it
 *   Data packets travel bidirectionally along each edge
 *   Floating micro-particles fill the background field
 */

(function () {
    'use strict';

    const canvas = document.getElementById('agentNetworkCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ── Resize ─────────────────────────────────────────────────
    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // ── Agent Node Definitions ──────────────────────────────────
    // cx/cy are fractional positions (0..1) of the viewport
    const AGENTS = [
        {
            name: 'Orchestrator',
            label: '⚡ Orchestrator',
            color: '#8b5cf6',
            glow:  'rgba(139,92,246,',
            cx: 0.50, cy: 0.46,
            r: 26, hub: true
        },
        {
            name: 'K8s Agent',
            label: '☸ K8s Agent',
            color: '#06b6d4',
            glow:  'rgba(6,182,212,',
            cx: 0.22, cy: 0.26,
            r: 17
        },
        {
            name: 'Cloud Agent',
            label: '☁ Cloud Agent',
            color: '#60a5fa',
            glow:  'rgba(96,165,250,',
            cx: 0.78, cy: 0.26,
            r: 17
        },
        {
            name: 'Metrics',
            label: '📊 Metrics',
            color: '#f59e0b',
            glow:  'rgba(245,158,11,',
            cx: 0.90, cy: 0.50,
            r: 17
        },
        {
            name: 'Log Agent',
            label: '📋 Log Agent',
            color: '#10b981',
            glow:  'rgba(16,185,129,',
            cx: 0.74, cy: 0.76,
            r: 17
        },
        {
            name: 'Code Agent',
            label: '🔬 Code Agent',
            color: '#f97316',
            glow:  'rgba(249,115,22,',
            cx: 0.26, cy: 0.76,
            r: 17
        },
        {
            name: 'Historical',
            label: '🧠 Historical',
            color: '#ec4899',
            glow:  'rgba(236,72,153,',
            cx: 0.10, cy: 0.50,
            r: 17
        },
    ];

    // ── Floating Background Particles ───────────────────────────
    const PARTICLE_COUNT = 70;
    const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x:     Math.random(),
        y:     Math.random(),
        vx:    (Math.random() - 0.5) * 0.00018,
        vy:    (Math.random() - 0.5) * 0.00018,
        r:     Math.random() * 1.6 + 0.4,
        alpha: Math.random() * 0.25 + 0.06,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        phase: Math.random() * Math.PI * 2,
    }));

    // ── Data Packet Class ───────────────────────────────────────
    class DataPacket {
        constructor(from, to, reverse) {
            this.from    = from;
            this.to      = to;
            this.t       = reverse ? 1 : 0;
            this.reverse = reverse;
            this.speed   = 0.0032 + Math.random() * 0.003;
            this.color   = from.color;
            this.size    = Math.random() * 2 + 2.5;
            this.alive   = true;
        }
        update() {
            this.t += this.reverse ? -this.speed : this.speed;
            if (this.t >= 1.02 || this.t <= -0.02) this.alive = false;
        }
        draw(W, H) {
            const x = lerp(this.from.cx * W, this.to.cx * W, clamp(this.t, 0, 1));
            const y = lerp(this.from.cy * H, this.to.cy * H, clamp(this.t, 0, 1));
            // Tail glow
            ctx.beginPath();
            ctx.arc(x, y, this.size * 1.8, 0, Math.PI * 2);
            ctx.fillStyle = this.color.replace('rgb', 'rgba').replace(')', ',0.18)');
            ctx.fill();
            // Core dot
            ctx.beginPath();
            ctx.arc(x, y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur  = 12;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    // ── State ───────────────────────────────────────────────────
    let packets         = [];
    let frame           = 0;
    let lastPacketFrame = -60;
    const PACKET_INTERVAL = 45;   // frames between new packets
    const CONNECTIONS = [];       // hub → each spoke

    // Build connection pairs (hub ↔ all spokes)
    for (let i = 1; i < AGENTS.length; i++) {
        CONNECTIONS.push([AGENTS[0], AGENTS[i]]);
    }

    // ── Animation Loop ──────────────────────────────────────────
    function draw() {
        requestAnimationFrame(draw);
        frame++;

        const W = canvas.width;
        const H = canvas.height;

        // Very subtle trail — not a hard clear so particles leave faint streaks
        ctx.fillStyle = 'rgba(9,9,11,0.18)';
        ctx.fillRect(0, 0, W, H);

        // ─ Connection Lines ─────────────────────────────────────
        ctx.save();
        ctx.lineWidth = 1;
        CONNECTIONS.forEach(([a, b]) => {
            const x1 = a.cx * W, y1 = a.cy * H;
            const x2 = b.cx * W, y2 = b.cy * H;

            // Gradient line (hub color → spoke color)
            const grad = ctx.createLinearGradient(x1, y1, x2, y2);
            grad.addColorStop(0, a.color + '28');
            grad.addColorStop(1, b.color + '28');

            ctx.strokeStyle = grad;
            ctx.setLineDash([5, 12]);
            ctx.lineDashOffset = -(frame * 0.6);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });
        ctx.setLineDash([]);
        ctx.restore();

        // ─ Background Particles ──────────────────────────────────
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = 1;
            if (p.x > 1) p.x = 0;
            if (p.y < 0) p.y = 1;
            if (p.y > 1) p.y = 0;

            const flicker = 0.55 + 0.45 * Math.sin(frame * 0.025 + p.phase);
            ctx.globalAlpha = p.alpha * flicker;
            ctx.beginPath();
            ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // ─ Spawn Packets ─────────────────────────────────────────
        if (frame - lastPacketFrame >= PACKET_INTERVAL) {
            lastPacketFrame = frame;
            const pair = CONNECTIONS[Math.floor(Math.random() * CONNECTIONS.length)];
            const rev  = Math.random() > 0.45;
            packets.push(new DataPacket(pair[0], pair[1], rev));
        }

        // ─ Draw + Prune Packets ──────────────────────────────────
        packets = packets.filter(p => p.alive);
        packets.forEach(p => { p.update(); p.draw(W, H); });

        // ─ Agent Nodes ───────────────────────────────────────────
        AGENTS.forEach(agent => {
            const x     = agent.cx * W;
            const y     = agent.cy * H;
            const pulse = 0.72 + 0.28 * Math.sin(frame * 0.038 + agent.cx * 8);

            // Outer aura (large radial gradient)
            const auraR = agent.r * (agent.hub ? 3.2 : 2.8) * pulse;
            const aura  = ctx.createRadialGradient(x, y, 0, x, y, auraR);
            aura.addColorStop(0,   agent.glow + '0.18)');
            aura.addColorStop(0.5, agent.glow + '0.06)');
            aura.addColorStop(1,   agent.glow + '0)');
            ctx.beginPath();
            ctx.arc(x, y, auraR, 0, Math.PI * 2);
            ctx.fillStyle = aura;
            ctx.fill();

            // Inner ring (secondary pulse)
            const ringR = agent.r * 1.55 * (0.85 + 0.15 * Math.sin(frame * 0.055 + agent.cy * 6));
            ctx.beginPath();
            ctx.arc(x, y, ringR, 0, Math.PI * 2);
            ctx.strokeStyle = agent.color + '40';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Node background circle
            ctx.beginPath();
            ctx.arc(x, y, agent.r, 0, Math.PI * 2);
            const bgGrad = ctx.createRadialGradient(x - agent.r * 0.3, y - agent.r * 0.3, 0, x, y, agent.r);
            bgGrad.addColorStop(0, '#1e1b4b');
            bgGrad.addColorStop(1, '#09090b');
            ctx.fillStyle = bgGrad;
            ctx.fill();

            // Node border
            ctx.strokeStyle = agent.color;
            ctx.lineWidth   = agent.hub ? 2.5 : 1.8;
            ctx.shadowColor = agent.color;
            ctx.shadowBlur  = 14 * pulse;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Hub extra ring
            if (agent.hub) {
                ctx.beginPath();
                ctx.arc(x, y, agent.r + 7 * pulse, 0, Math.PI * 2);
                ctx.strokeStyle = agent.color + '55';
                ctx.lineWidth   = 1;
                ctx.stroke();
            }

            // Label text
            ctx.font      = `${agent.hub ? 600 : 500} ${agent.hub ? 10 : 9}px 'Outfit', sans-serif`;
            ctx.fillStyle = agent.hub
                ? 'rgba(255,255,255,0.75)'
                : 'rgba(200,210,230,0.55)';
            ctx.textAlign  = 'center';
            ctx.shadowColor = agent.color;
            ctx.shadowBlur  = 6;
            ctx.fillText(agent.label, x, y + agent.r + 14);
            ctx.shadowBlur = 0;
        });
    }

    // ── Start ───────────────────────────────────────────────────
    draw();

})();
