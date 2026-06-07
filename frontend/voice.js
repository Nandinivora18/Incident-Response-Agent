/**
 * 🎤 Voice Input — Web Speech API
 * Lets users speak incident titles and descriptions.
 * Zero backend — entirely browser-native SpeechRecognition.
 *
 * Features:
 *  - Click mic button on Title → dictate incident title
 *  - Click mic button on Description → dictate full description
 *  - Live interim transcript shown in the status bar
 *  - Mic button turns red + pulses while recording
 *  - Animated waveform bars during recording
 *  - Stop button or second mic-click stops recording
 *  - Final transcript is appended (not overwritten) to any existing text
 *  - Graceful fallback message if browser doesn't support it
 */

(function () {
    'use strict';

    // ── Browser support check ──────────────────────────────────
    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    function markUnsupported(btn) {
        btn.disabled = true;
        btn.title = 'Voice input not supported in this browser (use Chrome/Edge)';
        btn.style.opacity = '0.35';
        btn.style.cursor  = 'not-allowed';
    }

    // ── State ──────────────────────────────────────────────────
    let activeRecognition = null;   // currently running SpeechRecognition instance
    let activeTarget      = null;   // 'title' | 'description'
    let activeBtn         = null;   // the mic button that triggered recording

    // ── DOM refs (resolved after DOMContentLoaded) ─────────────
    let voiceTitleBtn, voiceDescBtn, voiceStopBtn;
    let voiceStatusBar, voiceStatusText, voiceInterim;
    let titleInput, descTextarea;

    // ── Core: start recording ──────────────────────────────────
    function startRecognition(target, btn) {
        // If already recording → stop it
        if (activeRecognition) {
            stopRecognition();
            if (activeTarget === target) return; // toggle off
        }

        if (!SpeechRecognition) {
            markUnsupported(btn);
            if (typeof Toast !== 'undefined') {
                Toast.show('🎤 Voice input requires Chrome or Edge browser', 'warning', 4000);
            }
            return;
        }

        activeTarget = target;
        activeBtn    = btn;

        const recognition = new SpeechRecognition();
        recognition.continuous    = true;
        recognition.interimResults = true;
        recognition.lang          = 'en-US';
        recognition.maxAlternatives = 1;

        activeRecognition = recognition;

        // ── Events ──────────────────────────────────────────────
        recognition.onstart = () => {
            btn.classList.add('listening');
            btn.querySelector('.mic-label') &&
                (btn.querySelector('.mic-label').textContent = 'Recording…');
            showStatusBar();
            if (typeof Toast !== 'undefined') {
                Toast.show('🎤 Listening… speak now', 'info', 2500);
            }
        };

        recognition.onresult = (event) => {
            let interim = '';
            let final   = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript + ' ';
                } else {
                    interim += transcript;
                }
            }

            // Show interim live in status bar
            if (voiceInterim) voiceInterim.textContent = interim || '';

            // Append finalized text to the target field
            if (final) {
                appendToField(target, final);
            }
        };

        recognition.onerror = (event) => {
            console.warn('[Voice] Error:', event.error);
            if (event.error === 'not-allowed') {
                if (typeof Toast !== 'undefined') {
                    Toast.show('🎤 Microphone access denied — check browser permissions', 'error', 5000);
                }
            } else if (event.error !== 'aborted') {
                if (typeof Toast !== 'undefined') {
                    Toast.show(`🎤 Voice error: ${event.error}`, 'warning', 3000);
                }
            }
            stopRecognition();
        };

        recognition.onend = () => {
            // Auto-restart if still marked as active (continuous mode sometimes stops on silence)
            if (activeRecognition === recognition && activeTarget) {
                try { recognition.start(); } catch (_) { stopRecognition(); }
            }
        };

        try {
            recognition.start();
        } catch (err) {
            console.error('[Voice] Could not start:', err);
            stopRecognition();
        }
    }

    // ── Stop recording ─────────────────────────────────────────
    function stopRecognition() {
        if (activeRecognition) {
            try { activeRecognition.stop(); } catch (_) {}
            activeRecognition = null;
        }
        if (activeBtn) {
            activeBtn.classList.remove('listening');
            const lbl = activeBtn.querySelector('.mic-label');
            if (lbl) lbl.textContent = 'Speak';
        }
        activeTarget = null;
        activeBtn    = null;
        hideStatusBar();
        if (voiceInterim) voiceInterim.textContent = '';
    }

    // ── Append text to the right field ────────────────────────
    function appendToField(target, text) {
        const el = target === 'title' ? titleInput : descTextarea;
        if (!el) return;
        const existing = el.value.trim();
        el.value = existing ? existing + ' ' + text.trim() : text.trim();
        el.dispatchEvent(new Event('input', { bubbles: true }));
        // Auto-resize textarea if needed
        if (el.tagName === 'TEXTAREA') {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        }
    }

    // ── Status bar show/hide ───────────────────────────────────
    function showStatusBar() {
        if (voiceStatusBar) voiceStatusBar.style.display = 'flex';
    }
    function hideStatusBar() {
        if (voiceStatusBar) voiceStatusBar.style.display = 'none';
    }

    // ── Wire up on DOM ready ───────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        voiceTitleBtn  = document.getElementById('voiceTitleBtn');
        voiceDescBtn   = document.getElementById('voiceDescBtn');
        voiceStopBtn   = document.getElementById('voiceStopBtn');
        voiceStatusBar = document.getElementById('voiceStatusBar');
        voiceStatusText = document.getElementById('voiceStatusText');
        voiceInterim   = document.getElementById('voiceInterim');
        titleInput     = document.getElementById('title');
        descTextarea   = document.getElementById('description');

        if (!SpeechRecognition) {
            // Gracefully disable both buttons
            [voiceTitleBtn, voiceDescBtn].forEach(btn => btn && markUnsupported(btn));
            return;
        }

        // Title mic button
        voiceTitleBtn?.addEventListener('click', () => {
            startRecognition('title', voiceTitleBtn);
        });

        // Description mic button
        voiceDescBtn?.addEventListener('click', () => {
            startRecognition('description', voiceDescBtn);
        });

        // Stop button inside status bar
        voiceStopBtn?.addEventListener('click', () => {
            stopRecognition();
            if (typeof Toast !== 'undefined') {
                Toast.show('🎤 Voice recording stopped', 'info', 2000);
            }
        });

        // Stop recording if user navigates away from the investigate tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => stopRecognition());
        });
    });

})();
