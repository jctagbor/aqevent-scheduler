// ============================================================================
// AQEvent Scheduler - Admin Utilities (William & Mary)
// File: js/admin.js
// Additional admin functions and utilities
// ============================================================================

// ============================================================================
// ADMIN AUTHENTICATION UTILITIES
// ============================================================================

const AdminAuth = {
    // Check if user is currently authenticated as admin
    isAuthenticated: function() {
        const authData = window.GitHubAPI.getStoredAuthData();
        return authData && window.GitHubAPI.validateAdminPassword(authData.password);
    },
    
    // Get admin session info
    getSessionInfo: function() {
        const authData = window.GitHubAPI.getStoredAuthData();
        if (!authData) return null;
        
        return {
            authenticated: this.isAuthenticated(),
            hasToken: !!authData.token,
            tokenPreview: authData.token ? `${authData.token.substring(0, 8)}...` : null
        };
    },
    
    // Refresh authentication (extend session)
    refreshAuth: function() {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }
        
        const authData = window.GitHubAPI.getStoredAuthData();
        // Re-store to update timestamp
        window.GitHubAPI.storeAuthData(authData.token, authData.password);
        
        console.log('🔄 Admin session refreshed');
        return true;
    }
};

// ============================================================================
// ADMIN STATISTICS & ANALYTICS
// ============================================================================

const AdminAnalytics = {
    // Generate comprehensive event statistics
    generateStatistics: async function() {
        try {
            const pendingEvents = await window.GitHubAPI.loadPendingEvents();
            const approvedEvents = await window.GitHubAPI.loadApprovedEvents();
            
            const now = new Date();
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            return {
                pending: {
                    total: pendingEvents.length,
                    thisWeek: this.countEventsByDateRange(pendingEvents, startOfWeek, endOfWeek, 'submittedAt'),
                    thisMonth: this.countEventsByDateRange(pendingEvents, startOfMonth, endOfMonth, 'submittedAt')
                },
                approved: {
                    total: approvedEvents.length,
                    thisWeek: this.countEventsByDateRange(approvedEvents, startOfWeek, endOfWeek, 'eventDate'),
                    thisMonth: this.countEventsByDateRange(approvedEvents, startOfMonth, endOfMonth, 'eventDate'),
                    today: this.countEventsForDate(approvedEvents, new Date(), 'eventDate')
                },
                breakdown: {
                    byType: this.groupEventsByField(approvedEvents, 'eventType'),
                    byLocation: this.groupEventsByField(approvedEvents, 'location'),
                    byMonth: this.groupEventsByMonth(approvedEvents)
                }
            };
        } catch (error) {
            console.error('❌ Error generating statistics:', error);
            throw error;
        }
    },
    
    // Count events within date range
    countEventsByDateRange: function(events, startDate, endDate, dateField) {
        return events.filter(event => {
            const eventDate = new Date(event[dateField]);
            return eventDate >= startDate && eventDate <= endDate;
        }).length;
    },
    
    // Count events for specific date
    countEventsForDate: function(events, targetDate, dateField) {
        const targetDateStr = targetDate.toDateString();
        return events.filter(event => {
            const eventDate = new Date(event[dateField]);
            return eventDate.toDateString() === targetDateStr;
        }).length;
    },
    
    // Group events by field
    groupEventsByField: function(events, field) {
        const groups = {};
        events.forEach(event => {
            const value = event[field] || 'Unknown';
            groups[value] = (groups[value] || 0) + 1;
        });
        return groups;
    },
    
    // Group events by month
    groupEventsByMonth: function(events) {
        const months = {};
        events.forEach(event => {
            const date = new Date(event.eventDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months[monthKey] = (months[monthKey] || 0) + 1;
        });
        return months;
    }
};

// ============================================================================
// ADMIN EVENT MANAGEMENT
// ============================================================================

const AdminEvents = {
    // Batch approve events
    batchApprove: async function(eventIds, progressCallback) {
        const results = {
            successful: [],
            failed: [],
            total: eventIds.length
        };
        
        for (let i = 0; i < eventIds.length; i++) {
            const eventId = eventIds[i];
            
            try {
                if (progressCallback) {
                    progressCallback(i + 1, eventIds.length, `Approving event ${i + 1}...`);
                }
                
                const result = await window.GitHubAPI.approveEvent(eventId);
                
                if (result.success) {
                    results.successful.push(eventId);
                } else {
                    results.failed.push({ eventId, error: result.message });
                }
                
                // Small delay to prevent overwhelming API
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                results.failed.push({ eventId, error: error.message });
            }
        }
        
        return results;
    },
    
    // Batch reject events
    batchReject: async function(eventIds, reason, progressCallback) {
        const results = {
            successful: [],
            failed: [],
            total: eventIds.length
        };
        
        for (let i = 0; i < eventIds.length; i++) {
            const eventId = eventIds[i];
            
            try {
                if (progressCallback) {
                    progressCallback(i + 1, eventIds.length, `Rejecting event ${i + 1}...`);
                }
                
                const result = await window.GitHubAPI.rejectEvent(eventId, reason);
                
                if (result.success) {
                    results.successful.push(eventId);
                } else {
                    results.failed.push({ eventId, error: result.message });
                }
                
                // Small delay to prevent overwhelming API
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                results.failed.push({ eventId, error: error.message });
            }
        }
        
        return results;
    },
    
    // Find conflicting events
    findConflicts: async function(eventData) {
        try {
            const existingEvents = await window.GitHubAPI.loadApprovedEvents();
            return window.GitHubAPI.checkEventConflicts(eventData, existingEvents);
        } catch (error) {
            console.error('❌ Error checking conflicts:', error);
            return [];
        }
    },
    
    // Generate event report
    generateEventReport: function(events, options = {}) {
        const {
            includeStats = true,
            groupBy = 'none',
            sortBy = 'date',
            format = 'html'
        } = options;
        
        let sortedEvents = [...events];
        
        // Sort events
        switch (sortBy) {
            case 'name':
                sortedEvents.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'location':
                sortedEvents.sort((a, b) => a.location.localeCompare(b.location));
                break;
            case 'type':
                sortedEvents.sort((a, b) => a.eventType.localeCompare(b.eventType));
                break;
            default: // date
                sortedEvents.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
        }
        
        if (format === 'html') {
            return this.generateHTMLReport(sortedEvents, { includeStats, groupBy });
        } else if (format === 'csv') {
            return this.generateCSVReport(sortedEvents);
        }
        
        return sortedEvents;
    },
    
    // Generate HTML report
    generateHTMLReport: function(events, options) {
        const { includeStats, groupBy } = options;
        
        let html = `
            <div class="admin-report">
                <h2 class="text-primary">📊 Event Report</h2>
                <p class="text-muted">Generated on ${new Date().toLocaleDateString()}</p>
        `;
        
        if (includeStats) {
            const stats = this.calculateReportStats(events);
            html += `
                <div class="report-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--spacing-sm); margin: var(--spacing-lg) 0;">
                    <div class="stat-item text-center">
                        <div class="stat-number text-primary">${stats.total}</div>
                        <div class="stat-label">Total Events</div>
                    </div>
                    <div class="stat-item text-center">
                        <div class="stat-number text-success">${stats.upcoming}</div>
                        <div class="stat-label">Upcoming</div>
                    </div>
                    <div class="stat-item text-center">
                        <div class="stat-number text-warning">${stats.thisWeek}</div>
                        <div class="stat-label">This Week</div>
                    </div>
                    <div class="stat-item text-center">
                        <div class="stat-number text-gold">${stats.thisMonth}</div>
                        <div class="stat-label">This Month</div>
                    </div>
                </div>
            `;
        }
        
        // Group events if requested
        let groupedEvents = {};
        if (groupBy === 'type') {
            groupedEvents = AdminAnalytics.groupEventsByField(events, 'eventType');
            Object.keys(groupedEvents).forEach(type => {
                groupedEvents[type] = events.filter(e => e.eventType === type);
            });
        } else if (groupBy === 'location') {
            groupedEvents = AdminAnalytics.groupEventsByField(events, 'location');
            Object.keys(groupedEvents).forEach(location => {
                groupedEvents[location] = events.filter(e => e.location === location);
            });
        } else {
            groupedEvents['All Events'] = events;
        }
        
        // Generate event listings
        Object.entries(groupedEvents).forEach(([groupName, groupEvents]) => {
            if (Array.isArray(groupEvents)) {
                html += `
                    <h3 class="text-primary" style="margin-top: var(--spacing-xl);">${groupName} (${groupEvents.length})</h3>
                    <div class="events-list">
                `;
                
                groupEvents.forEach(event => {
                    html += `
                        <div class="event-item" style="border-left: 4px solid var(--wm-primary-green); padding: var(--spacing-sm); margin: var(--spacing-sm) 0; background: var(--wm-gray-100);">
                            <h5>${event.name}</h5>
                            <p><strong>Date:</strong> ${window.AQEventUtils.DateUtils.formatAcademic(event.eventDate)}</p>
                            <p><strong>Location:</strong> ${event.location}</p>
                            <p><strong>Contact:</strong> ${event.contactPerson} (${event.contactEmail})</p>
                            ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
                        </div>
                    `;
                });
                
                html += '</div>';
            }
        });
        
        html += '</div>';
        return html;
    },
    
    // Generate CSV report
    generateCSVReport: function(events) {
        const headers = [
            'Event Name',
            'Date',
            'Start Time',
            'End Time',
            'Location',
            'Type',
            'Contact Person',
            'Contact Email',
            'Contact Phone',
            'Staff',
            'Description'
        ];
        
        let csv = headers.join(',') + '\n';
        
        events.forEach(event => {
            const row = [
                `"${event.name || ''}"`,
                event.eventDate || '',
                window.AQEventUtils.DateUtils.formatTime(event.eventStartTime || ''),
                window.AQEventUtils.DateUtils.formatTime(event.eventEndTime || ''),
                `"${event.location || ''}"`,
                `"${event.eventType || ''}"`,
                `"${event.contactPerson || ''}"`,
                event.contactEmail || '',
                event.contactNumber || '',
                `"${event.staffWorkingEvent || ''}"`,
                `"${(event.description || '').replace(/"/g, '""')}"`
            ];
            csv += row.join(',') + '\n';
        });
        
        return csv;
    },
    
    // Calculate report statistics
    calculateReportStats: function(events) {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        return {
            total: events.length,
            upcoming: events.filter(e => new Date(e.eventDate) > new Date()).length,
            thisWeek: AdminAnalytics.countEventsByDateRange(events, startOfWeek, endOfWeek, 'eventDate'),
            thisMonth: AdminAnalytics.countEventsByDateRange(events, startOfMonth, endOfMonth, 'eventDate')
        };
    }
};

// ============================================================================
// ADMIN SYSTEM UTILITIES
// ============================================================================

const AdminSystem = {
    // Comprehensive system health check
    runHealthCheck: async function() {
        const checks = [];
        
        try {
            // GitHub API connectivity
            const apiTest = await window.GitHubAPI.testGitHubConnection();
            checks.push({
                name: 'GitHub API',
                status: apiTest.success ? 'PASS' : 'FAIL',
                details: apiTest.success ? 'Connected successfully' : apiTest.error
            });
            
            // Data file accessibility
            try {
                await window.GitHubAPI.loadPendingEvents();
                checks.push({
                    name: 'Pending Events Data',
                    status: 'PASS',
                    details: 'File accessible and readable'
                });
            } catch (error) {
                checks.push({
                    name: 'Pending Events Data',
                    status: 'FAIL',
                    details: error.message
                });
            }
            
            try {
                await window.GitHubAPI.loadApprovedEvents();
                checks.push({
                    name: 'Approved Events Data',
                    status: 'PASS',
                    details: 'File accessible and readable'
                });
            } catch (error) {
                checks.push({
                    name: 'Approved Events Data',
                    status: 'FAIL',
                    details: error.message
                });
            }
            
            try {
                await window.GitHubAPI.loadStudentNames();
                checks.push({
                    name: 'Student Names Data',
                    status: 'PASS',
                    details: 'File accessible and readable'
                });
            } catch (error) {
                checks.push({
                    name: 'Student Names Data',
                    status: 'FAIL',
                    details: error.message
                });
            }
            
            // Authentication status
            checks.push({
                name: 'Admin Authentication',
                status: AdminAuth.isAuthenticated() ? 'PASS' : 'FAIL',
                details: AdminAuth.isAuthenticated() ? 'Valid admin session' : 'Not authenticated'
            });
            
        } catch (error) {
            checks.push({
                name: 'System Health Check',
                status: 'FAIL',
                details: 'Health check failed: ' + error.message
            });
        }
        
        const failedChecks = checks.filter(check => check.status === 'FAIL').length;
        const passedChecks = checks.filter(check => check.status === 'PASS').length;
        
        let overall = 'HEALTHY';
        if (failedChecks > 0) {
            overall = failedChecks >= passedChecks ? 'UNHEALTHY' : 'DEGRADED';
        }
        
        return {
            overall,
            checks,
            summary: `${passedChecks} passed, ${failedChecks} failed`,
            timestamp: new Date().toISOString()
        };
    },
    
    // Clear system cache
    clearCache: function() {
        // Clear any cached data
        if (window.localStorage) {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('aqevent_')) {
                    localStorage.removeItem(key);
                }
            });
        }
        
        console.log('🧹 System cache cleared');
        return true;
    },
    
    // Export system logs
    exportLogs: function() {
        // This would collect system logs if implemented
        const logs = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            location: window.location.href,
            authentication: AdminAuth.getSessionInfo(),
            performance: {
                loadTime: performance.now(),
                memory: performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                } : null
            }
        };
        
        return JSON.stringify(logs, null, 2);
    }
};

// ============================================================================
// ADMIN UI HELPERS
// ============================================================================

const AdminUI = {
    // Create progress dialog
    createProgressDialog: function(title, subtitle) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'display: flex; z-index: 10000;';
        
        modal.innerHTML = `
            <div class="modal" style="max-width: 400px;">
                <div class="modal-header">
                    <div class="modal-title">${title}</div>
                    <div class="modal-subtitle">${subtitle}</div>
                </div>
                <div class="modal-body">
                    <div class="progress-container" style="margin-bottom: var(--spacing-sm);">
                        <div class="progress-bar" style="width: 100%; height: 20px; background: var(--wm-gray-200); border-radius: 10px; overflow: hidden;">
                            <div class="progress-fill" style="height: 100%; background: var(--wm-primary-green); width: 0%; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                    <div class="progress-text text-center">0%</div>
                    <div class="progress-details text-center text-muted">Preparing...</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        return {
            update: function(percent, message) {
                const fill = modal.querySelector('.progress-fill');
                const text = modal.querySelector('.progress-text');
                const details = modal.querySelector('.progress-details');
                
                fill.style.width = percent + '%';
                text.textContent = Math.round(percent) + '%';
                details.textContent = message;
            },
            close: function() {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }
        };
    },
    
    // Download file
    downloadFile: function(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },
    
    // Confirm dialog with W&M styling
    confirm: function(message, title = 'Confirm Action') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.cssText = 'display: flex; z-index: 10001;';
            
            modal.innerHTML = `
                <div class="modal" style="max-width: 400px;">
                    <div class="modal-header">
                        <div class="modal-title">${title}</div>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                        <div style="display: flex; gap: var(--spacing-sm); justify-content: flex-end; margin-top: var(--spacing-lg);">
                            <button class="btn btn-secondary cancel-btn">Cancel</button>
                            <button class="btn btn-primary confirm-btn">Confirm</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.querySelector('.cancel-btn').addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });
            
            modal.querySelector('.confirm-btn').addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });
            
            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            });
        });
    }
};

// ============================================================================
// EXPORT ADMIN UTILITIES
// ============================================================================

// Make admin utilities available globally
window.AdminUtils = {
    Auth: AdminAuth,
    Analytics: AdminAnalytics,
    Events: AdminEvents,
    System: AdminSystem,
    UI: AdminUI
};

console.log('⚙️ Admin utilities loaded successfully');
console.log('📊 Available: window.AdminUtils.{Auth, Analytics, Events, System, UI}');
