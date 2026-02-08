// ===== MAIN APPLICATION =====

class NGLSpammerApp {
    constructor() {
        this.utils = window.NGLUtils;
        this.api = new NGLApi();
        this.isAttacking = false;
        this.currentAttack = null;
        this.stats = {
            sent: 0,
            failed: 0,
            startTime: 0,
            totalMessages: 0
        };
        
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.loadSettings();
        this.updateCharCount();
        
        // Initial log
        this.addLog('NGL Spammer Pro initialized', 'info');
        this.addLog(`API: ${this.api.baseUrl}`, 'info');
    }

    cacheDOM() {
        // Inputs
        this.linkInput = document.getElementById('linkInput');
        this.pesanInput = document.getElementById('pesanInput');
        this.jumlahSlider = document.getElementById('jumlahSlider');
        this.jumlahInput = document.getElementById('jumlahInput');
        this.charCount = document.getElementById('charCount');
        
        // Buttons
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.testBtn = document.getElementById('testBtn');
        
        // Progress
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.percentage = document.getElementById('percentage');
        
        // Log
        this.statusLog = document.getElementById('statusLog');
        
        // Stats
        this.sentCountElem = document.getElementById('sentCount');
        this.failedCountElem = document.getElementById('failedCount');
        this.successRateElem = document.getElementById('successRate');
        this.timeElapsedElem = document.getElementById('timeElapsed');
    }

    bindEvents() {
        // Input events
        this.pesanInput.addEventListener('input', () => this.updateCharCount());
        this.jumlahSlider.addEventListener('input', () => this.syncNumberInput());
        this.jumlahInput.addEventListener('input', () => this.syncRangeSlider());
        
        // Button events
        this.startBtn.addEventListener('click', () => this.startAttack());
        this.stopBtn.addEventListener('click', () => this.stopAttack());
        this.testBtn.addEventListener('click', () => this.testConnection());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.startAttack();
            }
            if (e.key === 'Escape') {
                this.stopAttack();
            }
        });
    }

    // ===== ATTACK CONTROL =====
    async startAttack() {
        if (this.isAttacking) return;
        
        const link = this.linkInput.value.trim();
        const message = this.pesanInput.value.trim();
        const count = parseInt(this.jumlahInput.value);
        const mode = document.querySelector('input[name="mode"]:checked').value;
        
        // Validation
        if (!this.utils.validateNGLLink(link)) {
            this.addLog('Invalid NGL link format', 'error');
            this.utils.shakeElement(this.linkInput);
            this.utils.playSound('error');
            return;
        }
        
        if (!this.utils.validateMessage(message)) {
            this.addLog('Message cannot be empty or too long', 'error');
            this.utils.shakeElement(this.pesanInput);
            this.utils.playSound('error');
            return;
        }
        
        if (count < 1 || count > 1000) {
            this.addLog('Message count must be between 1-1000', 'error');
            this.utils.playSound('error');
            return;
        }
        
        // Start attack
        this.isAttacking = true;
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;
        
        this.stats = {
            sent: 0,
            failed: 0,
            startTime: Date.now(),
            totalMessages: count
        };
        
        this.updateStats();
        this.addLog(`Starting attack: ${count} messages to ${link}`, 'info');
        
        const delay = this.utils.getDelayForMode(mode);
        this.addLog(`Mode: ${mode.toUpperCase()} (${delay}ms delay)`, 'info');
        
        // Start attack
        try {
            this.currentAttack = this.api.sendBatch(
                link,
                message,
                count,
                delay,
                (current, total, result) => this.onProgress(current, total, result)
            );
            
            const results = await this.currentAttack;
            
            this.addLog(`Attack complete! Sent: ${results.sent}, Failed: ${results.failed}`, 
                       results.failed === 0 ? 'success' : 'warning');
            this.addLog(`Duration: ${Math.round(results.duration / 1000)} seconds`, 'info');
            
            if (results.sent > 0) {
                this.utils.playSound('success');
            }
            
        } catch (error) {
            this.addLog(`Attack error: ${error.message}`, 'error');
            this.utils.playSound('error');
        } finally {
            this.finishAttack();
        }
    }

    stopAttack() {
        if (!this.isAttacking) return;
        
        this.isAttacking = false;
        this.currentAttack = null;
        this.addLog('Attack stopped manually', 'warning');
        this.utils.playSound('warning');
        this.finishAttack();
    }

    finishAttack() {
        this.isAttacking = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        
        this.progressFill.style.width = '100%';
        this.percentage.textContent = '100%';
        
        const successRate = this.utils.calculateSuccessRate(
            this.stats.sent, 
            this.stats.failed
        );
        
        this.progressText.textContent = 
            `Complete: ${this.stats.sent} sent, ${this.stats.failed} failed (${successRate}%)`;
    }

    // ===== PROGRESS HANDLING =====
    onProgress(current, total, result) {
        // Update stats
        if (result.success) {
            this.stats.sent++;
        } else {
            this.stats.failed++;
        }
        
        // Update progress bar
        const progress = Math.round((current / total) * 100);
        this.progressFill.style.width = `${progress}%`;
        this.percentage.textContent = `${progress}%`;
        this.progressText.textContent = `Sending ${current}/${total}`;
        
        // Add log entry
        const logType = result.success ? 'success' : 'error';
        const logMsg = result.success ? 
            `Message ${current}/${total} sent` : 
            `Message ${current}/${total} failed`;
        
        this.addLog(logMsg, logType);
        
        // Update statistics
        this.updateStats();
    }

    // ===== HELPER METHODS =====
    async testConnection() {
        this.addLog('Testing API connection...', 'info');
        
        const result = await this.api.testConnection();
        
        if (result.connected) {
            this.addLog('✅ API connection successful!', 'success');
            this.utils.playSound('success');
        } else {
            this.addLog(`❌ Connection failed: ${result.error}`, 'error');
            this.utils.playSound('error');
        }
    }

    updateCharCount() {
        const count = this.pesanInput.value.length;
        this.charCount.textContent = `${count}/500 karakter`;
        
        if (count > 500) {
            this.charCount.classList.add('text-danger');
        } else {
            this.charCount.classList.remove('text-danger');
        }
    }

    syncNumberInput() {
        this.jumlahInput.value = this.jumlahSlider.value;
    }

    syncRangeSlider() {
        let value = parseInt(this.jumlahInput.value) || 10;
        if (value < 1) value = 1;
        if (value > 1000) value = 1000;
        this.jumlahInput.value = value;
        this.jumlahSlider.value = Math.min(value, 100);
    }

    addLog(message, type = 'info') {
        const logEntry = this.utils.createLogEntry(message, type);
        this.statusLog.appendChild(logEntry);
        this.statusLog.scrollTop = this.statusLog.scrollHeight;
    }

    updateStats() {
        this.sentCountElem.textContent = this.utils.formatNumber(this.stats.sent);
        this.failedCountElem.textContent = this.utils.formatNumber(this.stats.failed);
        
        const successRate = this.utils.calculateSuccessRate(
            this.stats.sent, 
            this.stats.failed
        );
        this.successRateElem.textContent = `${successRate}%`;
        
        if (this.stats.startTime > 0) {
            const seconds = Math.round((Date.now() - this.stats.startTime) / 1000);
            this.timeElapsedElem.textContent = `${seconds}s`;
        }
    }

    loadSettings() {
        // Load from localStorage if available
        const savedLink = localStorage.getItem('ngl_last_link');
        const savedMessage = localStorage.getItem('ngl_last_message');
        const savedCount = localStorage.getItem('ngl_last_count');
        
        if (savedLink) this.linkInput.value = savedLink;
        if (savedMessage) this.pesanInput.value = savedMessage;
        if (savedCount) {
            this.jumlahInput.value = savedCount;
            this.jumlahSlider.value = Math.min(savedCount, 100);
        }
    }

    saveSettings() {
        localStorage.setItem('ngl_last_link', this.linkInput.value);
        localStorage.setItem('ngl_last_message', this.pesanInput.value);
        localStorage.setItem('ngl_last_count', this.jumlahInput.value);
    }
}

// ===== GLOBAL FUNCTIONS =====
function copyDeployCommand() {
    const command = 'vercel --prod --name ngl-spammer-pro';
    NGLUtils.copyToClipboard(command).then(success => {
        if (success) {
            alert('Deploy command copied to clipboard!\n\nRun: vercel --prod --name ngl-spammer-pro');
        }
    });
}

function showApiDocs() {
    alert(`API Documentation:\n\nEndpoint: https://api-faa.my.id/faa/ngl-spam\n\nParameters:\n• link: NGL link (URL encoded)\n• pesan: Message (URL encoded)\n• jumlah: Number of messages\n\nExample:\nhttps://api-faa.my.id/faa/ngl-spam?link=https%3A%2F%2Fngl.link%2Ftest&pesan=Hello&jumlah=10`);
}

// ===== INITIALIZE APP =====
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NGLSpammerApp();
    
    // Save settings on page unload
    window.addEventListener('beforeunload', () => {
        window.app.saveSettings();
    });
});
