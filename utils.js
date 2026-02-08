// ===== API HANDLER =====

class NGLApi {
    constructor() {
        this.baseUrl = 'https://api-faa.my.id/faa/ngl-spam';
        this.timeout = 30000; // 30 seconds
    }

    // Send single message
    async sendMessage(link, message) {
        const encodedLink = encodeURIComponent(link);
        const encodedMessage = encodeURIComponent(message);
        
        const url = `${this.baseUrl}?link=${encodedLink}&pesan=${encodedMessage}&jumlah=1`;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'NGL-Spammer-Pro/2.1.0'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.text();
            return {
                success: result.includes('success') || result.includes('Success'),
                data: result,
                status: response.status
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                status: 0
            };
        }
    }

    // Test API connection
    async testConnection() {
        const testUrl = `${this.baseUrl}?link=https%3A%2F%2Fngl.link%2Ftest&pesan=test&jumlah=1`;
        
        try {
            const response = await fetch(testUrl, { timeout: 10000 });
            return {
                connected: response.ok,
                status: response.status,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Send multiple messages (batch)
    async sendBatch(link, message, count, delay = 1000, onProgress = null) {
        const results = {
            sent: 0,
            failed: 0,
            total: count,
            startTime: Date.now(),
            messages: []
        };
        
        for (let i = 0; i < count; i++) {
            const result = await this.sendMessage(link, message);
            
            results.messages.push({
                index: i + 1,
                success: result.success,
                timestamp: new Date().toISOString()
            });
            
            if (result.success) {
                results.sent++;
            } else {
                results.failed++;
            }
            
            // Call progress callback if provided
            if (typeof onProgress === 'function') {
                onProgress(i + 1, count, result);
            }
            
            // Delay between messages (if not last message)
            if (delay > 0 && i < count - 1) {
                await NGLUtils.sleep(delay);
            }
        }
        
        results.endTime = Date.now();
        results.duration = results.endTime - results.startTime;
        results.successRate = NGLUtils.calculateSuccessRate(results.sent, results.failed);
        
        return results;
    }

    // Get API status
    getStatus() {
        return {
            baseUrl: this.baseUrl,
            timeout: this.timeout,
            version: '1.0',
            timestamp: new Date().toISOString()
        };
    }
}

// Export for use in other files
window.NGLApi = NGLApi;
