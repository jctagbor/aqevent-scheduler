// ============================================================================
// AQEvent Scheduler - Complete Admin Functions (William & Mary)
// File: js/admin.js
// Combines admin utilities with admin panel functionality
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
// ADMIN ANALYTICS & STATISTICS
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
            const eventDate = new Date(event[dateField] || event.eventData?.[dateField]);
            return eventDate >= startDate && eventDate <= endDate;
        }).length;
    },
    
    // Count events for specific date
    countEventsForDate: function(events, targetDate, dateField) {
        const targetDateStr = targetDate.toDateString();
        return events.filter(event => {
            const eventDate = new Date(event[dateField] || event.eventData?.[dateField]);
            return eventDate.toDateString() === targetDateStr;
        }).length;
    },
    
    // Group events by field
    groupEventsByField: function(events, field) {
        const groups = {};
        events.forEach(event => {
            const value = (event[field] || event.eventData?.[field]) || 'Unknown';
            groups[value] = (groups[value] || 0) + 1;
        });
        return groups;
    },
    
    // Group events by month
    groupEventsByMonth: function(events) {
        const months = {};
        events.forEach(event => {
            const date = new Date(event.eventDate || event.eventData?.eventDate);
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
    }
};

// ============================================================================
// ADMIN PANEL MAIN FUNCTIONALITY
// ============================================================================

// Admin panel state
let currentEventForAction = null;
let pendingEvents = [];
let approvedEvents = [];
let adminStats = { pending: 0, approved: 0, today: 0, thisMonth: 0 };
let currentView = 'pending';
let activeFilters = {
    eventType: '',
    dateRange: '',
    searchTerm: ''
};

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on the admin page
    if (window.location.pathname.includes('admin') || document.getElementById('adminMainContent')) {
        console.log('⚙️ Initializing Enhanced W&M Admin Panel...');
        initializeAdminPanel();
    }
});

// Main admin panel initialization
async function initializeAdminPanel() {
    try {
        // Setup authentication
        setupAuthentication();
        
        // Check if already authenticated
        if (checkExistingAuth()) {
            await showAdminPanel();
        } else {
            showAuthRequired();
        }
        
        console.log('✅ Enhanced admin panel initialized');
        
    } catch (error) {
        console.error('❌ Admin panel initialization failed:', error);
        showError('Failed to initialize admin panel: ' + error.message);
    }
}

// ============================================================================
// AUTHENTICATION SYSTEM
// ============================================================================

// Setup authentication system
function setupAuthentication() {
    // Login modal events
    const loginBtn = document.getElementById('loginBtn');
    const loginModalClose = document.getElementById('loginModalClose');
    const cancelLoginBtn = document.getElementById('cancelLoginBtn');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginBtn) loginBtn.addEventListener('click', showLoginModal);
    if (loginModalClose) loginModalClose.addEventListener('click', hideLoginModal);
    if (cancelLoginBtn) cancelLoginBtn.addEventListener('click', hideLoginModal);
    if (adminLoginForm) adminLoginForm.addEventListener('submit', handleLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // Token help
    const tokenHelpBtn = document.getElementById('tokenHelpBtn');
    const tokenHelpModalClose = document.getElementById('tokenHelpModalClose');
    const closeTokenHelpBtn = document.getElementById('closeTokenHelpBtn');
    
    if (tokenHelpBtn) tokenHelpBtn.addEventListener('click', showTokenHelp);
    if (tokenHelpModalClose) tokenHelpModalClose.addEventListener('click', hideTokenHelp);
    if (closeTokenHelpBtn) closeTokenHelpBtn.addEventListener('click', hideTokenHelp);
    
    // Test connection when token is entered
    const githubTokenInput = document.getElementById('githubToken');
    if (githubTokenInput) {
        githubTokenInput.addEventListener('input', debounce(testGitHubConnection, 1000));
    }
    
    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
                this.classList.remove('show');
            }
        });
    });
}

// Check existing authentication
function checkExistingAuth() {
    const authData = window.GitHubAPI.getStoredAuthData();
    if (authData && window.GitHubAPI.validateAdminPassword(authData.password)) {
        console.log('✅ Found valid authentication');
        return true;
    }
    console.log('🔐 No valid authentication found');
    return false;
}

// Show authentication required screen
function showAuthRequired() {
    const authContainer = document.getElementById('authRequiredContainer');
    const mainContent = document.getElementById('adminMainContent');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (authContainer) authContainer.style.display = 'block';
    if (mainContent) mainContent.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
}

// Show login modal
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    const passwordInput = document.getElementById('adminPassword');
    
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
    if (passwordInput) passwordInput.focus();
}

// Hide login modal
function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    const connectionTest = document.getElementById('connectionTest');
    
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
    if (connectionTest) connectionTest.style.display = 'none';
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const passwordInput = document.getElementById('adminPassword');
    const tokenInput = document.getElementById('githubToken');
    const rememberInput = document.getElementById('rememberSession');
    
    const password = passwordInput?.value || '';
    const token = tokenInput?.value || '';
    const remember = rememberInput?.checked || false;
    
    console.log('🔑 Attempting admin authentication...');
    
    // Validate password
    if (!window.GitHubAPI.validateAdminPassword(password)) {
        showNotification('Invalid administrator password', 'error');
        return;
    }
    
    // Validate token format
    if (!token.startsWith('ghp_') || token.length < 40) {
        showNotification('Please enter a valid GitHub token (starts with ghp_)', 'error');
        return;
    }
    
    try {
        // Store auth data
        window.GitHubAPI.storeAuthData(token, password);
        
        // Test GitHub connection
        const connectionTest = await window.GitHubAPI.testGitHubConnection();
        if (!connectionTest.success) {
            showNotification('GitHub connection failed: ' + connectionTest.error, 'error');
            window.GitHubAPI.clearAuthData();
            return;
        }
        
        console.log('✅ Authentication successful');
        showNotification('Authentication successful! Welcome to the admin panel.', 'success');
        
        hideLoginModal();
        await showAdminPanel();
        
    } catch (error) {
        console.error('❌ Authentication error:', error);
        showNotification('Authentication failed: ' + error.message, 'error');
        window.GitHubAPI.clearAuthData();
    }
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        window.GitHubAPI.clearAuthData();
        showNotification('Logged out successfully', 'info');
        showAuthRequired();
        console.log('🚪 Admin logged out');
    }
}

// ============================================================================
// ADMIN PANEL MAIN INTERFACE
// ============================================================================

// Show admin panel
async function showAdminPanel() {
    const authContainer = document.getElementById('authRequiredContainer');
    const mainContent = document.getElementById('adminMainContent');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (authContainer) authContainer.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    
    // Setup enhanced admin functionality
    setupEnhancedAdminControls();
    
    // Load admin data
    await loadAdminData();
}

// Setup enhanced admin controls
function setupEnhancedAdminControls() {
    // Basic admin controls
    const refreshBtn = document.getElementById('refreshBtn');
    const approveAllBtn = document.getElementById('approveAllBtn');
    const systemHealthBtn = document.getElementById('systemHealthBtn');
    
    if (refreshBtn) refreshBtn.addEventListener('click', loadAdminData);
    if (approveAllBtn) approveAllBtn.addEventListener('click', approveAllEvents);
    if (systemHealthBtn) systemHealthBtn.addEventListener('click', runSystemHealth);
    
    // Enhanced clickable stat cards
    const pendingStatsCard = document.getElementById('pendingStatsCard');
    const approvedStatsCard = document.getElementById('approvedStatsCard');
    const todayStatsCard = document.getElementById('todayStatsCard');
    const monthStatsCard = document.getElementById('monthStatsCard');
    
    if (pendingStatsCard) pendingStatsCard.addEventListener('click', () => switchView('pending'));
    if (approvedStatsCard) approvedStatsCard.addEventListener('click', () => switchView('approved'));
    if (todayStatsCard) todayStatsCard.addEventListener('click', () => switchView('today'));
    if (monthStatsCard) monthStatsCard.addEventListener('click', () => switchView('month'));
    
    // Filter controls
    const eventTypeFilter = document.getElementById('eventTypeFilter');
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const emptyStateAction = document.getElementById('emptyStateAction');
    
    if (eventTypeFilter) eventTypeFilter.addEventListener('change', applyFilters);
    if (dateRangeFilter) dateRangeFilter.addEventListener('change', applyFilters);
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);
    if (emptyStateAction) emptyStateAction.addEventListener('click', () => {
        clearFilters();
        loadAdminData();
    });
    
    // Event action modal
    const actionModalClose = document.getElementById('actionModalClose');
    const cancelActionBtn = document.getElementById('cancelActionBtn');
    const approveEventBtn = document.getElementById('approveEventBtn');
    const rejectEventBtn = document.getElementById('rejectEventBtn');
    
    if (actionModalClose) actionModalClose.addEventListener('click', hideEventActionModal);
    if (cancelActionBtn) cancelActionBtn.addEventListener('click', hideEventActionModal);
    if (approveEventBtn) approveEventBtn.addEventListener('click', handleApproveEvent);
    if (rejectEventBtn) rejectEventBtn.addEventListener('click', showRejectionModal);
    
    // Rejection modal
    const rejectionModalClose = document.getElementById('rejectionModalClose');
    const cancelRejectionBtn = document.getElementById('cancelRejectionBtn');
    const rejectionForm = document.getElementById('rejectionForm');
    
    if (rejectionModalClose) rejectionModalClose.addEventListener('click', hideRejectionModal);
    if (cancelRejectionBtn) cancelRejectionBtn.addEventListener('click', hideRejectionModal);
    if (rejectionForm) rejectionForm.addEventListener('submit', handleRejectEvent);
}

// ============================================================================
// DATA LOADING & STATISTICS
// ============================================================================

// Load admin data
async function loadAdminData() {
    try {
        showAdminLoading(true);
        
        console.log('📊 Loading enhanced admin data...');
        
        // Load both pending and approved events
        pendingEvents = await window.GitHubAPI.loadPendingEvents();
        approvedEvents = await window.GitHubAPI.loadApprovedEvents();
        
        console.log('📋 Loaded', pendingEvents.length, 'pending events');
        console.log('✅ Loaded', approvedEvents.length, 'approved events');
        
        // Calculate statistics
        calculateStats();
        
        // Update UI
        updateStatsDisplay();
        updateCurrentView();
        
        showAdminLoading(false);
        showNotification('Admin data loaded successfully', 'success');
        
    } catch (error) {
        showAdminLoading(false);
        console.error('❌ Error loading admin data:', error);
        showNotification('Error loading admin data: ' + error.message, 'error');
    }
}

// Calculate admin statistics
function calculateStats() {
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    
    adminStats.pending = pendingEvents.length;
    adminStats.approved = approvedEvents.length;
    
    // Events today (from approved events)
    adminStats.today = approvedEvents.filter(event => {
        const eventDate = new Date(event.eventDate || event.eventData?.eventDate);
        return eventDate.toDateString() === today.toDateString();
    }).length;
    
    // Events this month (from approved events)
    adminStats.thisMonth = approvedEvents.filter(event => {
        const eventDate = new Date(event.eventDate || event.eventData?.eventDate);
        return eventDate.getMonth() === thisMonth && eventDate.getFullYear() === thisYear;
    }).length;
}

// Update statistics display
function updateStatsDisplay() {
    const pendingCountEl = document.getElementById('pendingCount');
    const approvedCountEl = document.getElementById('approvedCount');
    const todayCountEl = document.getElementById('todayCount');
    const monthCountEl = document.getElementById('monthCount');
    
    if (pendingCountEl) pendingCountEl.textContent = adminStats.pending;
    if (approvedCountEl) approvedCountEl.textContent = adminStats.approved;
    if (todayCountEl) todayCountEl.textContent = adminStats.today;
    if (monthCountEl) monthCountEl.textContent = adminStats.thisMonth;
    
    // Update active card styling
    document.querySelectorAll('.clickable-stat-card').forEach(card => {
        card.classList.toggle('active', card.dataset.filter === currentView);
    });
}

// ============================================================================
// VIEW SWITCHING & FILTERING
// ============================================================================

// Switch view based on stat card clicked
function switchView(view) {
    currentView = view;
    updateCurrentView();
    updateStatsDisplay();
    
    // Clear filters when switching views
    clearFilters();
}

// Update current view display
function updateCurrentView() {
    const titleElement = document.getElementById('currentViewTitle');
    const approveAllBtn = document.getElementById('approveAllBtn');
    let events = [];
    
    switch (currentView) {
        case 'pending':
            if (titleElement) titleElement.textContent = '📋 Pending Event Approvals';
            events = pendingEvents;
            if (approveAllBtn) approveAllBtn.style.display = 'inline-flex';
            break;
            
        case 'approved':
            if (titleElement) titleElement.textContent = '✅ Approved Events';
            events = approvedEvents;
            if (approveAllBtn) approveAllBtn.style.display = 'none';
            break;
            
        case 'today':
            if (titleElement) titleElement.textContent = '📅 Events Today';
            events = getEventsForToday();
            if (approveAllBtn) approveAllBtn.style.display = 'none';
            break;
            
        case 'month':
            if (titleElement) titleElement.textContent = '📊 Events This Month';
            events = getEventsForThisMonth();
            if (approveAllBtn) approveAllBtn.style.display = 'none';
            break;
    }
    
    renderEvents(events);
}

// Get events for today
function getEventsForToday() {
    const today = new Date();
    return approvedEvents.filter(event => {
        const eventDate = new Date(event.eventDate || event.eventData?.eventDate);
        return eventDate.toDateString() === today.toDateString();
    });
}

// Get events for this month
function getEventsForThisMonth() {
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    
    return approvedEvents.filter(event => {
        const eventDate = new Date(event.eventDate || event.eventData?.eventDate);
        return eventDate.getMonth() === thisMonth && eventDate.getFullYear() === thisYear;
    });
}

// Apply filters
function applyFilters() {
    const eventTypeFilter = document.getElementById('eventTypeFilter');
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    
    activeFilters.eventType = eventTypeFilter?.value || '';
    activeFilters.dateRange = dateRangeFilter?.value || '';
    
    updateActiveFiltersDisplay();
    updateCurrentView();
}

// Clear filters
function clearFilters() {
    activeFilters.eventType = '';
    activeFilters.dateRange = '';
    activeFilters.searchTerm = '';
    
    const eventTypeFilter = document.getElementById('eventTypeFilter');
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    
    if (eventTypeFilter) eventTypeFilter.value = '';
    if (dateRangeFilter) dateRangeFilter.value = '';
    
    updateActiveFiltersDisplay();
    updateCurrentView();
}

// Update active filters display
function updateActiveFiltersDisplay() {
    const container = document.getElementById('activeFilters');
    if (!container) return;
    
    const filters = [];
    
    if (activeFilters.eventType) {
        filters.push(`Type: ${activeFilters.eventType}`);
    }
    if (activeFilters.dateRange) {
        filters.push(`Date: ${activeFilters.dateRange}`);
    }
    
    if (filters.length > 0) {
        container.innerHTML = filters.map(filter => 
            `<span class="active-filter-tag">${filter}</span>`
        ).join('');
    } else {
        container.innerHTML = '';
    }
}

// Filter events based on active filters
function filterEvents(events) {
    return events.filter(event => {
        const eventData = event.eventData || event;
        
        // Event type filter
        if (activeFilters.eventType) {
            const eventType = (eventData.eventType || '').toLowerCase();
            if (!eventType.includes(activeFilters.eventType.toLowerCase())) {
                return false;
            }
        }
        
        // Date range filter
        if (activeFilters.dateRange) {
            const eventDate = new Date(eventData.eventDate);
            const today = new Date();
            
            switch (activeFilters.dateRange) {
                case 'today':
                    if (eventDate.toDateString() !== today.toDateString()) return false;
                    break;
                case 'tomorrow':
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);
                    if (eventDate.toDateString() !== tomorrow.toDateString()) return false;
                    break;
                case 'week':
                    const weekEnd = new Date(today);
                    weekEnd.setDate(today.getDate() + 7);
                    if (eventDate < today || eventDate > weekEnd) return false;
                    break;
                case 'month':
                    if (eventDate.getMonth() !== today.getMonth() || 
                        eventDate.getFullYear() !== today.getFullYear()) return false;
                    break;
                case 'next-month':
                    const nextMonth = new Date(today);
                    nextMonth.setMonth(today.getMonth() + 1);
                    if (eventDate.getMonth() !== nextMonth.getMonth() || 
                        eventDate.getFullYear() !== nextMonth.getFullYear()) return false;
                    break;
            }
        }
        
        return true;
    });
}

// ============================================================================
// EVENT RENDERING
// ============================================================================

// Render events based on current view and filters
function renderEvents(events) {
    const container = document.getElementById('eventsDisplayContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (!container || !emptyState) return;
    
    // Apply filters
    const filteredEvents = filterEvents(events);
    
    if (filteredEvents.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        
        // Update empty state based on current view
        const emptyTitle = document.getElementById('emptyStateTitle');
        const emptyMessage = document.getElementById('emptyStateMessage');
        
        if (emptyTitle && emptyMessage) {
            if (currentView === 'pending') {
                emptyTitle.textContent = '🎉 All Caught Up!';
                emptyMessage.textContent = 'No pending events to review at this time.';
            } else {
                emptyTitle.textContent = '📭 No Events Found';
                emptyMessage.textContent = 'No events match your current filters.';
            }
        }
        
        return;
    }
    
    emptyState.style.display = 'none';
    
    const eventsHTML = filteredEvents.map(event => createEventCard(event, currentView)).join('');
    container.innerHTML = eventsHTML;
}

// Create event card HTML (enhanced for different views)
function createEventCard(event, viewType) {
    const eventData = event.eventData || event;
    const submittedDate = new Date(event.submittedAt || event.submittedDate || event.approvedAt || Date.now());
    
    // Different card styling based on view type
    let cardClass = 'card schedule-card';
    let actionButtons = '';
    
    if (viewType === 'pending') {
        cardClass += ' pending';
        actionButtons = `
            <button class="btn btn-outline btn-sm" onclick="viewEventDetails('${event.id}')">👁️ View Details</button>
            <button class="btn btn-danger btn-sm" onclick="rejectEvent('${event.id}')">❌ Reject</button>
            <button class="btn btn-success btn-sm" onclick="approveEvent('${event.id}')">✅ Approve</button>
        `;
    } else {
        cardClass += ' approved';
        actionButtons = `
            <button class="btn btn-outline btn-sm" onclick="viewEventDetails('${event.id}')">👁️ View Details</button>
            <span class="text-success">✅ Approved</span>
        `;
    }
    
    return `
        <div class="${cardClass}" style="margin-bottom: var(--spacing-md);">
            <div class="card-header">
                <div class="flex-between">
                    <div>
                        <h4 class="card-title">${eventData.name || 'Unnamed Event'}</h4>
                        <div class="flex-center gap-sm">
                            <span class="event-type-badge ${(eventData.eventType || '').toLowerCase().replace(/\s+/g, '-')}">${eventData.eventType || 'Unknown'}</span>
                            <span class="text-muted">📅 ${window.AQEventUtils.DateUtils.formatAcademic(eventData.eventDate)}</span>
                            <span class="text-muted">⏰ ${window.AQEventUtils.DateUtils.formatTime(eventData.eventStartTime)}</span>
                            <span class="text-muted">📍 ${eventData.location}</span>
                        </div>
                    </div>
                    <div class="text-muted">
                        <small>${viewType === 'pending' ? 'Submitted' : 'Processed'}: ${submittedDate.toLocaleDateString()}</small>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
                    <div>
                        <strong>Time:</strong><br>
                        ${window.AQEventUtils.DateUtils.formatTime(eventData.eventStartTime)} - ${window.AQEventUtils.DateUtils.formatTime(eventData.eventEndTime)}
                    </div>
                    <div>
                        <strong>Contact:</strong><br>
                        ${eventData.contactPerson}<br>
                        <a href="mailto:${eventData.contactEmail}" class="text-primary">${eventData.contactEmail}</a>
                    </div>
                    <div>
                        <strong>Staff:</strong><br>
                        ${eventData.staffWorkingEvent || 'Not specified'}
                    </div>
                </div>
                
                ${eventData.description ? `<p><strong>Description:</strong> ${eventData.description}</p>` : ''}
                
                <div class="card-footer">
                    ${actionButtons}
                </div>
            </div>
        </div>
    `;
}

// ============================================================================
// EVENT ACTIONS
// ============================================================================

// Event action functions (global so they can be called from HTML)
window.viewEventDetails = function(eventId) {
    const event = findEventById(eventId);
    if (event) {
        showEventActionModal(event, 'view');
    }
};

window.approveEvent = function(eventId) {
    const event = findEventById(eventId);
    if (event) {
        showEventActionModal(event, 'approve');
    }
};

window.rejectEvent = function(eventId) {
    const event = findEventById(eventId);
    if (event) {
        showEventActionModal(event, 'reject');
    }
};

// Find event by ID across all collections
function findEventById(eventId) {
    return pendingEvents.find(e => e.id === eventId) || 
           approvedEvents.find(e => e.id === eventId);
}

// Show event action modal
function showEventActionModal(event, action) {
    currentEventForAction = event;
    const eventData = event.eventData || event;
    
    const actionModalTitle = document.getElementById('actionModalTitle');
    const actionModalSubtitle = document.getElementById('actionModalSubtitle');
    const eventActionContent = document.getElementById('eventActionContent');
    const approveEventBtn = document.getElementById('approveEventBtn');
    const rejectEventBtn = document.getElementById('rejectEventBtn');
    const eventActionModal = document.getElementById('eventActionModal');
    
    if (actionModalTitle) actionModalTitle.textContent = eventData.name;
    if (actionModalSubtitle) actionModalSubtitle.textContent = `${action.charAt(0).toUpperCase() + action.slice(1)} Event`;
    
    if (eventActionContent) {
        const content = `
            <div style="display: grid; gap: var(--spacing-sm);">
                <div class="card">
                    <div class="card-body">
                        <h6 class="text-primary">📋 Event Details</h6>
                        <p><strong>Date:</strong> ${window.AQEventUtils.DateUtils.formatAcademic(eventData.eventDate)}</p>
                        <p><strong>Time:</strong> ${window.AQEventUtils.DateUtils.formatTime(eventData.eventStartTime)} - ${window.AQEventUtils.DateUtils.formatTime(eventData.eventEndTime)}</p>
                        <p><strong>Location:</strong> ${eventData.location}</p>
                        <p><strong>Type:</strong> ${eventData.eventType}</p>
                        ${eventData.description ? `<p><strong>Description:</strong> ${eventData.description}</p>` : ''}
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <h6 class="text-primary">👤 Contact Information</h6>
                        <p><strong>Contact:</strong> ${eventData.contactPerson}</p>
                        <p><strong>Email:</strong> <a href="mailto:${eventData.contactEmail}">${eventData.contactEmail}</a></p>
                        <p><strong>Phone:</strong> ${eventData.contactNumber}</p>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <h6 class="text-primary">👥 Staff & Logistics</h6>
                        <p><strong>Staff:</strong> ${eventData.staffWorkingEvent}</p>
                        ${eventData.neededLogistics ? `<p><strong>Logistics:</strong> ${eventData.neededLogistics}</p>` : ''}
                        ${eventData.studentEmployeesNeeded === 'Yes' ? `<p><strong>Students Needed:</strong> ${eventData.numberOfStudentsNeeded || 'Not specified'}</p>` : ''}
                        ${eventData.assignedStudents ? `<p><strong>Assigned Students:</strong> ${eventData.assignedStudents}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
        eventActionContent.innerHTML = content;
    }
    
    // Show/hide action buttons based on current view
    const isApproved = currentView !== 'pending';
    if (approveEventBtn) approveEventBtn.style.display = (!isApproved && action === 'approve') ? 'inline-flex' : 'none';
    if (rejectEventBtn) rejectEventBtn.style.display = (!isApproved && action === 'reject') ? 'inline-flex' : 'none';
    
    if (eventActionModal) {
        eventActionModal.style.display = 'flex';
        eventActionModal.classList.add('show');
    }
}

// Hide event action modal
function hideEventActionModal() {
    const eventActionModal = document.getElementById('eventActionModal');
    if (eventActionModal) {
        eventActionModal.style.display = 'none';
        eventActionModal.classList.remove('show');
    }
    currentEventForAction = null;
}

// Handle approve event
async function handleApproveEvent() {
    if (!currentEventForAction) return;
    
    try {
        showNotification('Approving event...', 'info');
        
        const result = await window.GitHubAPI.approveEvent(currentEventForAction.id);
        
        if (result.success) {
            showNotification('Event approved successfully! 🎉', 'success');
            hideEventActionModal();
            await loadAdminData();
        } else {
            showNotification('Error approving event: ' + result.message, 'error');
        }
        
    } catch (error) {
        console.error('❌ Error approving event:', error);
        showNotification('Error approving event: ' + error.message, 'error');
    }
}

// Show rejection modal
function showRejectionModal() {
    hideEventActionModal();
    const rejectionModal = document.getElementById('rejectionModal');
    const rejectionReason = document.getElementById('rejectionReason');
    
    if (rejectionModal) {
        rejectionModal.style.display = 'flex';
        rejectionModal.classList.add('show');
    }
    if (rejectionReason) rejectionReason.focus();
}

// Hide rejection modal
function hideRejectionModal() {
    const rejectionModal = document.getElementById('rejectionModal');
    const rejectionReason = document.getElementById('rejectionReason');
    
    if (rejectionModal) {
        rejectionModal.style.display = 'none';
        rejectionModal.classList.remove('show');
    }
    if (rejectionReason) rejectionReason.value = '';
}

// Handle reject event
async function handleRejectEvent(event) {
    event.preventDefault();
    
    if (!currentEventForAction) return;
    
    const rejectionReason = document.getElementById('rejectionReason');
    const reason = rejectionReason?.value.trim() || '';
    
    if (!reason) {
        showNotification('Please provide a reason for rejection', 'warning');
        return;
    }
    
    try {
        showNotification('Rejecting event...', 'info');
        
        const result = await window.GitHubAPI.rejectEvent(currentEventForAction.id, reason);
        
        if (result.success) {
            showNotification('Event rejected successfully', 'success');
            hideRejectionModal();
            await loadAdminData();
        } else {
            showNotification('Error rejecting event: ' + result.message, 'error');
        }
        
    } catch (error) {
        console.error('❌ Error rejecting event:', error);
        showNotification('Error rejecting event: ' + error.message, 'error');
    }
}

// Approve all events
async function approveAllEvents() {
    const eventsToApprove = filterEvents(pendingEvents);
    
    if (eventsToApprove.length === 0) {
        showNotification('No pending events to approve', 'info');
        return;
    }
    
    if (!confirm(`Are you sure you want to approve all ${eventsToApprove.length} filtered pending events?`)) {
        return;
    }
    
    showNotification(`Approving ${eventsToApprove.length} events...`, 'info');
    
    let approved = 0;
    let errors = 0;
    
    for (const event of eventsToApprove) {
        try {
            const result = await window.GitHubAPI.approveEvent(event.id);
            if (result.success) {
                approved++;
            } else {
                errors++;
            }
        } catch (error) {
            errors++;
            console.error('Error approving event:', error);
        }
    }
    
    const message = errors === 0 ? 
        `Successfully approved all ${approved} events! 🎉` :
        `Approved ${approved} events. ${errors} failed.`;
    
    showNotification(message, errors === 0 ? 'success' : 'warning');
    await loadAdminData();
}

// Run system health check
async function runSystemHealth() {
    try {
        showNotification('Running system health check...', 'info');
        
        const health = await AdminSystem.runHealthCheck();
        const statusElement = document.getElementById('systemStatus');
        
        if (statusElement) {
            if (health.overall === 'HEALTHY') {
                statusElement.innerHTML = `
                    <div class="text-success">
                        <h6>✅ System Healthy</h6>
                        <p>All systems operational</p>
                        <p>Events: ${pendingEvents.length} pending, ${approvedEvents.length} approved</p>
                        <p>Last Check: ${new Date().toLocaleString()}</p>
                    </div>
                `;
                showNotification('✅ System health check passed', 'success');
            } else {
                statusElement.innerHTML = `
                    <div class="text-error">
                        <h6>❌ System Issues Detected</h6>
                        <p>Status: ${health.overall}</p>
                        <p>Summary: ${health.summary}</p>
                        <details>
                            <summary>View Details</summary>
                            ${health.checks.map(check => 
                                `<p>${check.status === 'PASS' ? '✅' : '❌'} ${check.name}: ${check.details}</p>`
                            ).join('')}
                        </details>
                        <p>Last Check: ${new Date().toLocaleString()}</p>
                    </div>
                `;
                showNotification('⚠️ System health issues detected', 'warning');
            }
        }
        
    } catch (error) {
        console.error('❌ Health check error:', error);
        showNotification('Health check failed: ' + error.message, 'error');
    }
}

// ============================================================================
// TOKEN & CONNECTION TESTING
// ============================================================================

// Test GitHub connection
async function testGitHubConnection() {
    const githubTokenInput = document.getElementById('githubToken');
    const token = githubTokenInput?.value || '';
    
    if (!token || !token.startsWith('ghp_')) return;
    
    const testDiv = document.getElementById('connectionTest');
    const resultsDiv = document.getElementById('connectionResults');
    
    if (testDiv) testDiv.style.display = 'block';
    if (resultsDiv) resultsDiv.innerHTML = '<p class="text-muted">Testing GitHub connection...</p>';
    
    try {
        // Temporarily store token for testing
        const originalAuth = window.GitHubAPI.getStoredAuthData();
        window.GitHubAPI.storeAuthData(token, 'temp');
        
        const result = await window.GitHubAPI.testGitHubConnection();
        
        if (resultsDiv) {
            if (result.success) {
                resultsDiv.innerHTML = `
                    <p class="text-success">✅ Connection successful!</p>
                    <small class="text-muted">Repository: ${result.details?.full_name || 'Connected'}</small>
                `;
            } else {
                resultsDiv.innerHTML = `
                    <p class="text-error">❌ Connection failed</p>
                    <small class="text-muted">${result.error}</small>
                `;
            }
        }
        
        // Restore original auth
        if (originalAuth) {
            window.GitHubAPI.storeAuthData(originalAuth.token, originalAuth.password);
        } else {
            window.GitHubAPI.clearAuthData();
        }
        
    } catch (error) {
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <p class="text-error">❌ Connection error</p>
                <small class="text-muted">${error.message}</small>
            `;
        }
    }
}

// Show token help
function showTokenHelp() {
    const tokenHelpModal = document.getElementById('tokenHelpModal');
    if (tokenHelpModal) {
        tokenHelpModal.style.display = 'flex';
        tokenHelpModal.classList.add('show');
    }
}

// Hide token help
function hideTokenHelp() {
    const tokenHelpModal = document.getElementById('tokenHelpModal');
    if (tokenHelpModal) {
        tokenHelpModal.style.display = 'none';
        tokenHelpModal.classList.remove('show');
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Show admin loading
function showAdminLoading(show) {
    const loadingDiv = document.getElementById('adminLoadingDiv');
    if (loadingDiv) {
        loadingDiv.style.display = show ? 'block' : 'none';
    }
}

// Show notification (using global function)
function showNotification(message, type) {
    if (window.AQEventUtils && window.AQEventUtils.showNotification) {
        window.AQEventUtils.showNotification(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Show error
function showError(message) {
    console.error('Admin Error:', message);
    showNotification(message, 'error');
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================================================
// EXPORT ADMIN UTILITIES
// ============================================================================

// Make admin utilities available globally
window.AdminUtils = {
    Auth: AdminAuth,
    Analytics: AdminAnalytics,
    Events: AdminEvents,
    System: AdminSystem
};

console.log('⚙️ Complete admin utilities loaded successfully');
console.log('📊 Available: window.AdminUtils.{Auth, Analytics, Events, System}');
