// ============================================================================
// GitHub API Functions for AQEvent Scheduler
// File: js/github-api.js
// ============================================================================

const GITHUB_CONFIG = {
    owner: 'jctagbor',
    repo: 'aqevent-scheduler',
    branch: 'main',
    apiBase: 'https://api.github.com',
    rawBase: 'https://raw.githubusercontent.com'
};

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

// Simple encryption for token storage (basic security)
function encryptToken(token, password) {
    const combined = token + '|' + password;
    return btoa(combined); // Base64 encoding
}

function decryptToken(encrypted) {
    try {
        const decoded = atob(encrypted);
        const [token, password] = decoded.split('|');
        return { token, password };
    } catch (error) {
        return null;
    }
}

// Store encrypted token in localStorage
function storeAuthData(token, password) {
    const encrypted = encryptToken(token, password);
    localStorage.setItem('aqevent_auth', encrypted);
}

// Get stored auth data
function getStoredAuthData() {
    const encrypted = localStorage.getItem('aqevent_auth');
    if (!encrypted) return null;
    return decryptToken(encrypted);
}

// Clear stored auth data
function clearAuthData() {
    localStorage.removeItem('aqevent_auth');
}

// Get current GitHub token
function getGitHubToken() {
    const authData = getStoredAuthData();
    return authData ? authData.token : null;
}

// Validate admin password
function validateAdminPassword(password) {
    return password === 'AQadmin654321*';
}

// ============================================================================
// GITHUB API CORE FUNCTIONS
// ============================================================================

// Make authenticated request to GitHub API
async function makeGitHubRequest(endpoint, options = {}) {
    const token = getGitHubToken();
    if (!token) {
        throw new Error('No GitHub token available. Please authenticate first.');
    }

    const url = `${GITHUB_CONFIG.apiBase}${endpoint}`;
    const headers = {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API Error (${response.status}): ${errorData.message || response.statusText}`);
    }

    return response.json();
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

// Read JSON file from repository
async function readJSONFile(filePath) {
    try {
        // Use raw GitHub content for reading (no auth needed)
        const url = `${GITHUB_CONFIG.rawBase}/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${filePath}`;
        
        const response = await fetch(url);
        
        if (response.status === 404) {
            // File doesn't exist yet, return empty structure
            console.log(`File ${filePath} doesn't exist yet, returning empty data`);
            return getEmptyDataStructure(filePath);
        }
        
        if (!response.ok) {
            throw new Error(`Failed to read file ${filePath}: ${response.statusText}`);
        }
        
        const content = await response.text();
        
        // Handle empty files
        if (!content.trim()) {
            return getEmptyDataStructure(filePath);
        }
        
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return getEmptyDataStructure(filePath);
    }
}

// Write JSON file to repository
async function writeJSONFile(filePath, data, commitMessage = null) {
    try {
        const message = commitMessage || `Update ${filePath}`;
        
        // Get current file info (if exists)
        let sha = null;
        try {
            const fileInfo = await makeGitHubRequest(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`);
            sha = fileInfo.sha;
        } catch (error) {
            // File doesn't exist, sha remains null
            console.log(`File ${filePath} doesn't exist, creating new file`);
        }
        
        // Prepare content
        const content = btoa(JSON.stringify(data, null, 2)); // Base64 encode
        
        // Prepare request body
        const body = {
            message,
            content,
            branch: GITHUB_CONFIG.branch
        };
        
        if (sha) {
            body.sha = sha; // Required for updating existing files
        }
        
        // Make the request
        const result = await makeGitHubRequest(
            `/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`,
            {
                method: 'PUT',
                body: JSON.stringify(body)
            }
        );
        
        console.log(`Successfully wrote ${filePath}`);
        return result;
        
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        throw error;
    }
}

// Get empty data structure based on file type
function getEmptyDataStructure(filePath) {
    if (filePath.includes('pending.json')) {
        return { events: [], lastUpdated: new Date().toISOString() };
    } else if (filePath.includes('approved.json')) {
        return { events: [], lastUpdated: new Date().toISOString() };
    } else if (filePath.includes('students.json')) {
        return { 
            students: [
                "John Smith",
                "Sarah Johnson", 
                "Mike Davis",
                "Emily Brown",
                "Alex Wilson"
            ], 
            lastUpdated: new Date().toISOString() 
        };
    }
    return {};
}

// ============================================================================
// HIGH-LEVEL DATA FUNCTIONS
// ============================================================================

// Load pending events
async function loadPendingEvents() {
    const data = await readJSONFile('data/pending.json');
    return data.events || [];
}

// Load approved events
async function loadApprovedEvents() {
    const data = await readJSONFile('data/approved.json');
    return data.events || [];
}

// Load student names
async function loadStudentNames() {
    const data = await readJSONFile('data/students.json');
    return data.students || [];
}

// Save pending events
async function savePendingEvents(events, message = 'Update pending events') {
    const data = {
        events,
        lastUpdated: new Date().toISOString(),
        count: events.length
    };
    return await writeJSONFile('data/pending.json', data, message);
}

// Save approved events
async function saveApprovedEvents(events, message = 'Update approved events') {
    const data = {
        events,
        lastUpdated: new Date().toISOString(),
        count: events.length
    };
    return await writeJSONFile('data/approved.json', data, message);
}

// Save student names
async function saveStudentNames(students, message = 'Update student names') {
    const data = {
        students,
        lastUpdated: new Date().toISOString(),
        count: students.length
    };
    return await writeJSONFile('data/students.json', data, message);
}

// ============================================================================
// EVENT OPERATIONS
// ============================================================================

// Submit new event for approval
async function submitEventForApproval(eventData) {
    try {
        const events = await loadPendingEvents();
        
        const newEvent = {
            id: generateEventId(),
            ...eventData,
            submittedAt: new Date().toISOString(),
            status: 'pending'
        };
        
        events.push(newEvent);
        await savePendingEvents(events, `Add new event: ${eventData.name}`);
        
        return { success: true, eventId: newEvent.id };
    } catch (error) {
        console.error('Error submitting event:', error);
        throw error;
    }
}

// Approve event (move from pending to approved)
async function approveEvent(eventId) {
    try {
        const pendingEvents = await loadPendingEvents();
        const approvedEvents = await loadApprovedEvents();
        
        const eventIndex = pendingEvents.findIndex(e => e.id === eventId);
        if (eventIndex === -1) {
            throw new Error('Event not found in pending list');
        }
        
        const event = pendingEvents[eventIndex];
        event.status = 'approved';
        event.approvedAt = new Date().toISOString();
        
        // Move to approved
        approvedEvents.push(event);
        pendingEvents.splice(eventIndex, 1);
        
        // Save both files
        await Promise.all([
            savePendingEvents(pendingEvents, `Remove approved event: ${event.name}`),
            saveApprovedEvents(approvedEvents, `Approve event: ${event.name}`)
        ]);
        
        return { success: true };
    } catch (error) {
        console.error('Error approving event:', error);
        throw error;
    }
}

// Reject event (remove from pending)
async function rejectEvent(eventId, reason = '') {
    try {
        const pendingEvents = await loadPendingEvents();
        
        const eventIndex = pendingEvents.findIndex(e => e.id === eventId);
        if (eventIndex === -1) {
            throw new Error('Event not found in pending list');
        }
        
        const event = pendingEvents[eventIndex];
        pendingEvents.splice(eventIndex, 1);
        
        await savePendingEvents(pendingEvents, `Reject event: ${event.name} - ${reason}`);
        
        return { success: true };
    } catch (error) {
        console.error('Error rejecting event:', error);
        throw error;
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Generate unique event ID
function generateEventId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `EVT_${timestamp}_${random}`;
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Format time for display
function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Check for conflicts
function checkEventConflicts(newEvent, existingEvents) {
    const conflicts = [];
    const newDate = new Date(newEvent.eventDate);
    
    for (const event of existingEvents) {
        const eventDate = new Date(event.eventDate);
        
        // Same date and location
        if (newDate.toDateString() === eventDate.toDateString() && 
            newEvent.location === event.location) {
            
            // Check time overlap
            const newStart = new Date(`${newEvent.eventDate} ${newEvent.reservationStartTime}`);
            const newEnd = new Date(`${newEvent.eventDate} ${newEvent.reservationEndTime}`);
            const existingStart = new Date(`${event.eventDate} ${event.reservationStartTime}`);
            const existingEnd = new Date(`${event.eventDate} ${event.reservationEndTime}`);
            
            if (newStart < existingEnd && existingStart < newEnd) {
                conflicts.push({
                    type: 'room',
                    event: event,
                    message: `${event.location} is already booked from ${formatTime(event.reservationStartTime)} to ${formatTime(event.reservationEndTime)}`
                });
            }
        }
    }
    
    return conflicts;
}

// Test GitHub API connection
async function testGitHubConnection() {
    try {
        const token = getGitHubToken();
        if (!token) {
            return { success: false, error: 'No token available' };
        }
        
        const result = await makeGitHubRequest(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`);
        return { 
            success: true, 
            message: `Connected to ${result.full_name}`,
            details: result
        };
    } catch (error) {
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize GitHub API (call this when app loads)
async function initializeGitHubAPI() {
    console.log('🚀 Initializing GitHub API...');
    
    // Test connection if token is available
    const authData = getStoredAuthData();
    if (authData) {
        console.log('📋 Found stored auth data');
        const test = await testGitHubConnection();
        if (test.success) {
            console.log('✅ GitHub API connected successfully');
            return true;
        } else {
            console.warn('⚠️ GitHub API connection failed:', test.error);
        }
    } else {
        console.log('ℹ️ No stored auth data found');
    }
    
    return false;
}

// ============================================================================
// EXPORT FOR GLOBAL ACCESS
// ============================================================================

// Make functions available globally
window.GitHubAPI = {
    // Auth functions
    storeAuthData,
    getStoredAuthData,
    clearAuthData,
    validateAdminPassword,
    testGitHubConnection,
    
    // File operations
    readJSONFile,
    writeJSONFile,
    
    // Data functions
    loadPendingEvents,
    loadApprovedEvents,
    loadStudentNames,
    savePendingEvents,
    saveApprovedEvents,
    saveStudentNames,
    
    // Event operations
    submitEventForApproval,
    approveEvent,
    rejectEvent,
    
    // Utilities
    generateEventId,
    formatDate,
    formatTime,
    checkEventConflicts,
    
    // Initialize
    initializeGitHubAPI
};

console.log('📚 GitHub API module loaded successfully');
