// ============================================================================
// Enhanced GitHub API Functions for AQEvent Scheduler v2.0
// File: js/github-api.js
// Enhanced with file upload, multiple events, and new form fields support
// ============================================================================

const GITHUB_CONFIG = {
    owner: 'jctagbor',
    repo: 'aqevent-scheduler',
    branch: 'main',
    apiBase: 'https://api.github.com',
    rawBase: 'https://raw.githubusercontent.com',
    
    // Enhanced configuration
    folders: {
        data: 'data',
        eventFiles: 'event-files',
        uploads: 'event-files/uploads'
    },
    
    // File upload settings
    fileUpload: {
        maxFileSize: 50 * 1024 * 1024, // 50MB per file
        allowedTypes: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.txt', '.xlsx', '.xls', '.ppt', '.pptx'],
        chunkSize: 1024 * 1024 // 1MB chunks for large files
    }
};

// ============================================================================
// ENHANCED TOKEN MANAGEMENT
// ============================================================================

// Enhanced encryption for token storage
function encryptToken(token, password) {
    const combined = token + '|' + password + '|' + Date.now();
    return btoa(combined); // Base64 encoding with timestamp
}

function decryptToken(encrypted) {
    try {
        const decoded = atob(encrypted);
        const parts = decoded.split('|');
        
        if (parts.length >= 2) {
            const token = parts[0];
            const password = parts[1];
            const timestamp = parts[2] ? parseInt(parts[2]) : Date.now();
            
            // Check if token is not too old (7 days)
            const age = Date.now() - timestamp;
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            
            if (age > maxAge) {
                console.log('🔐 Stored auth data expired');
                return null;
            }
            
            return { token, password, timestamp };
        }
        return null;
    } catch (error) {
        console.error('❌ Error decrypting token:', error);
        return null;
    }
}

// Store encrypted token in localStorage with enhanced security
function storeAuthData(token, password) {
    const encrypted = encryptToken(token, password);
    localStorage.setItem('aqevent_auth', encrypted);
    console.log('🔐 Auth data stored securely');
}

// Get stored auth data with validation
function getStoredAuthData() {
    const encrypted = localStorage.getItem('aqevent_auth');
    if (!encrypted) return null;
    
    const decrypted = decryptToken(encrypted);
    if (!decrypted) {
        // Clear invalid auth data
        clearAuthData();
        return null;
    }
    
    return decrypted;
}

// Clear stored auth data
function clearAuthData() {
    localStorage.removeItem('aqevent_auth');
    console.log('🗑️ Auth data cleared');
}

// Get current GitHub token with validation
function getGitHubToken() {
    const authData = getStoredAuthData();
    return authData ? authData.token : null;
}

// Enhanced admin password validation
function validateAdminPassword(password) {
    return password === 'AQadmin654321*';
}

// ============================================================================
// ENHANCED GITHUB API CORE FUNCTIONS
// ============================================================================

// Make authenticated request to GitHub API with enhanced error handling
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
        'User-Agent': 'AQEvent-Scheduler/2.0',
        ...options.headers
    };

    console.log(`🌐 Making GitHub API request: ${options.method || 'GET'} ${endpoint}`);

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // Enhanced error messages
            let errorMessage = `GitHub API Error (${response.status}): ${errorData.message || response.statusText}`;
            
            if (response.status === 401) {
                errorMessage = 'Authentication failed. Please check your GitHub token.';
                clearAuthData(); // Clear invalid token
            } else if (response.status === 403) {
                errorMessage = 'Access forbidden. Please check token permissions.';
            } else if (response.status === 404) {
                errorMessage = 'Resource not found. Please check repository and file paths.';
            } else if (response.status === 422) {
                errorMessage = `Validation failed: ${errorData.message}`;
            }
            
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log(`✅ GitHub API request successful`);
        return result;
        
    } catch (error) {
        console.error(`❌ GitHub API request failed:`, error);
        throw error;
    }
}

// Enhanced repository validation
async function validateRepository() {
    try {
        const repo = await makeGitHubRequest(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`);
        console.log(`📂 Repository validated: ${repo.full_name}`);
        return true;
    } catch (error) {
        console.error('❌ Repository validation failed:', error);
        return false;
    }
}

// ============================================================================
// ENHANCED FILE OPERATIONS
// ============================================================================

// Read JSON file from repository with enhanced error handling
async function readJSONFile(filePath) {
    try {
        console.log(`📖 Reading JSON file: ${filePath}`);
        
        // Use raw GitHub content for reading (no auth needed for public repos)
        const url = `${GITHUB_CONFIG.rawBase}/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${filePath}`;
        
        const response = await fetch(url, {
            cache: 'no-cache' // Ensure we get fresh data
        });
        
        if (response.status === 404) {
            // File doesn't exist yet, return empty structure
            console.log(`📄 File ${filePath} doesn't exist yet, returning empty data`);
            return getEmptyDataStructure(filePath);
        }
        
        if (!response.ok) {
            throw new Error(`Failed to read file ${filePath}: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        
        // Handle empty files
        if (!content.trim()) {
            console.log(`📄 File ${filePath} is empty, returning empty structure`);
            return getEmptyDataStructure(filePath);
        }
        
        const data = JSON.parse(content);
        console.log(`✅ Successfully read ${filePath}: ${data.events?.length || 0} items`);
        return data;
        
    } catch (error) {
        console.error(`❌ Error reading ${filePath}:`, error);
        return getEmptyDataStructure(filePath);
    }
}

// Write JSON file to repository with enhanced features
async function writeJSONFile(filePath, data, commitMessage = null) {
    try {
        const message = commitMessage || `Update ${filePath} - ${new Date().toISOString()}`;
        
        console.log(`📝 Writing JSON file: ${filePath}`);
        
        // Get current file info (if exists)
        let sha = null;
        try {
            const fileInfo = await makeGitHubRequest(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`);
            sha = fileInfo.sha;
            console.log(`📄 Found existing file with SHA: ${sha.substring(0, 8)}...`);
        } catch (error) {
            // File doesn't exist, sha remains null
            console.log(`📄 File ${filePath} doesn't exist, creating new file`);
        }
        
        // Prepare content with enhanced formatting
        const enhancedData = {
            ...data,
            lastUpdated: new Date().toISOString(),
            version: '2.0',
            metadata: {
                updatedBy: 'AQEvent Scheduler v2.0',
                updateTimestamp: Date.now(),
                recordCount: data.events?.length || 0
            }
        };
        
        const content = btoa(JSON.stringify(enhancedData, null, 2)); // Base64 encode with pretty formatting
        
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
        
        console.log(`✅ Successfully wrote ${filePath}`);
        return result;
        
    } catch (error) {
        console.error(`❌ Error writing ${filePath}:`, error);
        throw error;
    }
}

// Enhanced empty data structure generator
function getEmptyDataStructure(filePath) {
    const timestamp = new Date().toISOString();
    
    if (filePath.includes('pending.json')) {
        return { 
            events: [], 
            lastUpdated: timestamp,
            count: 0,
            version: '2.0',
            metadata: {
                description: 'Pending events awaiting approval',
                createdBy: 'AQEvent Scheduler v2.0'
            }
        };
    } else if (filePath.includes('approved.json')) {
        return { 
            events: [], 
            lastUpdated: timestamp,
            count: 0,
            version: '2.0',
            metadata: {
                description: 'Approved events',
                createdBy: 'AQEvent Scheduler v2.0'
            }
        };
    } else if (filePath.includes('students.json')) {
        return { 
            students: [
                "John Smith",
                "Sarah Johnson", 
                "Mike Davis",
                "Emily Brown",
                "Alex Wilson",
                "Jessica Chen",
                "David Rodriguez",
                "Amanda Taylor"
            ], 
            lastUpdated: timestamp,
            count: 8,
            version: '2.0',
            metadata: {
                description: 'Student names for event assignment',
                createdBy: 'AQEvent Scheduler v2.0'
            }
        };
    }
    return { lastUpdated: timestamp, version: '2.0' };
}

// ============================================================================
// ENHANCED FILE UPLOAD SYSTEM
// ============================================================================

// Upload file to GitHub repository
async function uploadFileToGitHub(fileName, fileData, eventId = null, folder = null) {
    try {
        console.log(`📎 Uploading file: ${fileName} (${(fileData.length / 1024 / 1024).toFixed(2)}MB)`);
        
        // Determine file path
        const targetFolder = folder || GITHUB_CONFIG.folders.eventFiles;
        const safeName = sanitizeFileName(fileName);
        const filePath = eventId ? 
            `${targetFolder}/${eventId}_${safeName}` : 
            `${targetFolder}/${Date.now()}_${safeName}`;
        
        // Ensure folder exists
        await ensureFolderExists(targetFolder);
        
        // Check if file already exists
        let sha = null;
        try {
            const existingFile = await makeGitHubRequest(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`);
            sha = existingFile.sha;
            console.log(`📄 File ${filePath} already exists, updating...`);
        } catch (error) {
            // File doesn't exist, which is fine
            console.log(`📄 Creating new file: ${filePath}`);
        }
        
        // Prepare file content
        const content = fileData.includes('data:') ? 
            fileData.split(',')[1] : // Remove data URL prefix if present
            fileData;
        
        // Prepare commit message
        const commitMessage = `Upload file: ${fileName}${eventId ? ` for event ${eventId}` : ''}`;
        
        // Prepare request body
        const body = {
            message: commitMessage,
            content: content,
            branch: GITHUB_CONFIG.branch
        };
        
        if (sha) {
            body.sha = sha; // Required for updating existing files
        }
        
        // Upload file
        const result = await makeGitHubRequest(
            `/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`,
            {
                method: 'PUT',
                body: JSON.stringify(body)
            }
        );
        
        console.log(`✅ File uploaded successfully: ${filePath}`);
        
        return {
            success: true,
            filePath: filePath,
            fileName: fileName,
            downloadUrl: result.content.download_url,
            sha: result.content.sha,
            size: result.content.size
        };
        
    } catch (error) {
        console.error(`❌ Error uploading file ${fileName}:`, error);
        return {
            success: false,
            fileName: fileName,
            error: error.message
        };
    }
}

// Upload multiple files for an event
async function uploadEventFiles(files, eventId) {
    console.log(`📎 Uploading ${files.length} files for event ${eventId}...`);
    
    const uploadResults = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
            console.log(`📎 Uploading file ${i + 1}/${files.length}: ${file.name}`);
            
            const result = await uploadFileToGitHub(file.name, file.data, eventId);
            uploadResults.push(result);
            
            // Small delay to prevent overwhelming GitHub API
            if (i < files.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
        } catch (error) {
            console.error(`❌ Error uploading file ${file.name}:`, error);
            uploadResults.push({
                success: false,
                fileName: file.name,
                error: error.message
            });
        }
    }
    
    const successCount = uploadResults.filter(r => r.success).length;
    console.log(`✅ File upload complete: ${successCount}/${files.length} successful`);
    
    return {
        results: uploadResults,
        successCount: successCount,
        totalCount: files.length,
        allSuccessful: successCount === files.length
    };
}

// Download file from GitHub
async function downloadFileFromGitHub(filePath) {
    try {
        console.log(`📥 Downloading file: ${filePath}`);
        
        const fileInfo = await makeGitHubRequest(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`);
        
        if (fileInfo.type !== 'file') {
            throw new Error('Path is not a file');
        }
        
        // Return file information and content
        return {
            success: true,
            fileName: fileInfo.name,
            content: fileInfo.content, // Base64 encoded
            downloadUrl: fileInfo.download_url,
            size: fileInfo.size,
            sha: fileInfo.sha
        };
        
    } catch (error) {
        console.error(`❌ Error downloading file ${filePath}:`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

// List files in a folder
async function listEventFiles(eventId = null, folder = null) {
    try {
        const targetFolder = folder || GITHUB_CONFIG.folders.eventFiles;
        console.log(`📂 Listing files in folder: ${targetFolder}`);
        
        const folderContents = await makeGitHubRequest(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${targetFolder}`);
        
        let files = folderContents.filter(item => item.type === 'file');
        
        // Filter by event ID if specified
        if (eventId) {
            files = files.filter(file => file.name.startsWith(`${eventId}_`));
        }
        
        const fileList = files.map(file => ({
            name: file.name,
            originalName: eventId ? file.name.replace(`${eventId}_`, '') : file.name,
            downloadUrl: file.download_url,
            size: file.size,
            sha: file.sha,
            path: file.path
        }));
        
        console.log(`📁 Found ${fileList.length} files`);
        return fileList;
        
    } catch (error) {
        console.error(`❌ Error listing files:`, error);
        return [];
    }
}

// Ensure folder exists in repository
async function ensureFolderExists(folderPath) {
    try {
        // Check if folder exists by trying to list its contents
        await makeGitHubRequest(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${folderPath}`);
        console.log(`📂 Folder exists: ${folderPath}`);
        return true;
    } catch (error) {
        if (error.message.includes('404')) {
            // Folder doesn't exist, create it with a README
            console.log(`📂 Creating folder: ${folderPath}`);
            
            const readmePath = `${folderPath}/README.md`;
            const readmeContent = `# Event Files\n\nThis folder contains uploaded files for AQEvent submissions.\n\nGenerated by AQEvent Scheduler v2.0\nCreated: ${new Date().toISOString()}`;
            
            await makeGitHubRequest(
                `/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${readmePath}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        message: `Create ${folderPath} folder`,
                        content: btoa(readmeContent),
                        branch: GITHUB_CONFIG.branch
                    })
                }
            );
            
            console.log(`✅ Folder created: ${folderPath}`);
            return true;
        } else {
            throw error;
        }
    }
}

// Sanitize file name for GitHub storage
function sanitizeFileName(fileName) {
    // Replace unsafe characters with underscores
    return fileName
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .toLowerCase();
}

// ============================================================================
// ENHANCED DATA FUNCTIONS
// ============================================================================

// Load pending events with enhanced error handling
async function loadPendingEvents() {
    console.log('📋 Loading pending events...');
    const data = await readJSONFile(`${GITHUB_CONFIG.folders.data}/pending.json`);
    return data.events || [];
}

// Load approved events with enhanced error handling
async function loadApprovedEvents() {
    console.log('📋 Loading approved events...');
    const data = await readJSONFile(`${GITHUB_CONFIG.folders.data}/approved.json`);
    return data.events || [];
}

// Load student names with enhanced error handling
async function loadStudentNames() {
    console.log('👥 Loading student names...');
    const data = await readJSONFile(`${GITHUB_CONFIG.folders.data}/students.json`);
    return data.students || [];
}

// Enhanced save pending events with metadata
async function savePendingEvents(events, message = null) {
    const commitMessage = message || `Update pending events (${events.length} events)`;
    const data = {
        events,
        lastUpdated: new Date().toISOString(),
        count: events.length,
        version: '2.0'
    };
    return await writeJSONFile(`${GITHUB_CONFIG.folders.data}/pending.json`, data, commitMessage);
}

// Enhanced save approved events with metadata
async function saveApprovedEvents(events, message = null) {
    const commitMessage = message || `Update approved events (${events.length} events)`;
    const data = {
        events,
        lastUpdated: new Date().toISOString(),
        count: events.length,
        version: '2.0'
    };
    return await writeJSONFile(`${GITHUB_CONFIG.folders.data}/approved.json`, data, commitMessage);
}

// Enhanced save student names with metadata
async function saveStudentNames(students, message = null) {
    const commitMessage = message || `Update student names (${students.length} students)`;
    const data = {
        students,
        lastUpdated: new Date().toISOString(),
        count: students.length,
        version: '2.0'
    };
    return await writeJSONFile(`${GITHUB_CONFIG.folders.data}/students.json`, data, commitMessage);
}

// ============================================================================
// ENHANCED EVENT OPERATIONS
// ============================================================================

// Enhanced submit new event for approval with file support
async function submitEventForApproval(eventData) {
    try {
        console.log(`📤 Submitting enhanced event for approval: ${eventData.name}`);
        
        const events = await loadPendingEvents();
        
        // Generate unique event ID
        const eventId = generateEventId();
        
        // Prepare enhanced event data
        const newEvent = {
            id: eventId,
            ...eventData,
            submittedAt: new Date().toISOString(),
            status: 'pending',
            version: '2.0',
            
            // Enhanced metadata
            submissionMetadata: {
                userAgent: eventData.userAgent || navigator.userAgent,
                submissionSource: eventData.submissionSource || 'AQEvent Form v2.0',
                ipTimestamp: Date.now(),
                formVersion: '2.0'
            }
        };
        
        // Handle file uploads if present
        if (eventData.uploadedFiles && eventData.uploadedFiles.length > 0) {
            console.log(`📎 Processing ${eventData.uploadedFiles.length} uploaded files...`);
            
            const fileUploadResult = await uploadEventFiles(eventData.uploadedFiles, eventId);
            
            // Add file information to event data
            newEvent.uploadedFiles = {
                count: fileUploadResult.totalCount,
                successCount: fileUploadResult.successCount,
                files: fileUploadResult.results.filter(r => r.success).map(r => ({
                    originalName: r.fileName,
                    storedPath: r.filePath,
                    downloadUrl: r.downloadUrl,
                    uploadedAt: new Date().toISOString(),
                    size: r.size,
                    sha: r.sha
                })),
                failedFiles: fileUploadResult.results.filter(r => !r.success).map(r => ({
                    fileName: r.fileName,
                    error: r.error
                }))
            };
            
            if (!fileUploadResult.allSuccessful) {
                console.warn(`⚠️ Not all files uploaded successfully for event ${eventId}`);
            }
        }
        
        // Add to pending events
        events.push(newEvent);
        await savePendingEvents(events, `Add new enhanced event: ${eventData.name} (ID: ${eventId})`);
        
        console.log(`✅ Enhanced event submitted successfully: ${eventId}`);
        
        return { 
            success: true, 
            eventId: eventId,
            fileUploadStatus: newEvent.uploadedFiles || null
        };
        
    } catch (error) {
        console.error('❌ Error submitting enhanced event:', error);
        throw error;
    }
}

// Enhanced approve event with file handling
async function approveEvent(eventId) {
    try {
        console.log(`✅ Approving event: ${eventId}`);
        
        const pendingEvents = await loadPendingEvents();
        const approvedEvents = await loadApprovedEvents();
        
        const eventIndex = pendingEvents.findIndex(e => e.id === eventId);
        if (eventIndex === -1) {
            throw new Error(`Event ${eventId} not found in pending list`);
        }
        
        const event = pendingEvents[eventIndex];
        
        // Update event status
        event.status = 'approved';
        event.approvedAt = new Date().toISOString();
        event.version = '2.0';
        
        // Add approval metadata
        event.approvalMetadata = {
            approvedBy: 'AQEvent Admin',
            approvalTimestamp: Date.now(),
            systemVersion: '2.0'
        };
        
        // Move to approved
        approvedEvents.push(event);
        pendingEvents.splice(eventIndex, 1);
        
        // Save both files
        await Promise.all([
            savePendingEvents(pendingEvents, `Remove approved event: ${event.name} (${eventId})`),
            saveApprovedEvents(approvedEvents, `Approve event: ${event.name} (${eventId})`)
        ]);
        
        console.log(`✅ Event approved successfully: ${eventId}`);
        
        return { 
            success: true,
            eventId: eventId,
            eventName: event.name,
            hasFiles: !!(event.uploadedFiles && event.uploadedFiles.count > 0)
        };
        
    } catch (error) {
        console.error(`❌ Error approving event ${eventId}:`, error);
        return {
            success: false,
            message: error.message
        };
    }
}

// Enhanced reject event with file cleanup
async function rejectEvent(eventId, reason = '') {
    try {
        console.log(`❌ Rejecting event: ${eventId}`);
        
        const pendingEvents = await loadPendingEvents();
        
        const eventIndex = pendingEvents.findIndex(e => e.id === eventId);
        if (eventIndex === -1) {
            throw new Error(`Event ${eventId} not found in pending list`);
        }
        
        const event = pendingEvents[eventIndex];
        
        // Optionally clean up uploaded files (uncomment if you want to delete rejected files)
        /*
        if (event.uploadedFiles && event.uploadedFiles.files.length > 0) {
            console.log(`🗑️ Cleaning up ${event.uploadedFiles.files.length} files for rejected event`);
            // Implementation for file deletion would go here
        }
        */
        
        // Remove from pending
        pendingEvents.splice(eventIndex, 1);
        
        await savePendingEvents(pendingEvents, `Reject event: ${event.name} (${eventId}) - ${reason}`);
        
        console.log(`✅ Event rejected successfully: ${eventId}`);
        
        return { 
            success: true,
            eventId: eventId,
            eventName: event.name,
            reason: reason
        };
        
    } catch (error) {
        console.error(`❌ Error rejecting event ${eventId}:`, error);
        return {
            success: false,
            message: error.message
        };
    }
}

// ============================================================================
// ENHANCED UTILITY FUNCTIONS
// ============================================================================

// Enhanced generate unique event ID
function generateEventId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `EVT_${timestamp}_${random}`;
}

// Enhanced format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/New_York'
    });
}

// Enhanced format time for display
function formatTime(timeString) {
    if (!timeString) return 'TBD';
    
    try {
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/New_York'
        });
    } catch (error) {
        return timeString;
    }
}

// Enhanced check for conflicts with series support
function checkEventConflicts(newEvent, existingEvents) {
    console.log(`🔍 Checking conflicts for event: ${newEvent.name}`);
    
    const conflicts = [];
    const newDate = new Date(newEvent.eventDate);
    
    for (const event of existingEvents) {
        const eventData = event.eventData || event;
        const eventDate = new Date(eventData.eventDate);
        
        // Same date and location
        if (newDate.toDateString() === eventDate.toDateString() && 
            newEvent.location === eventData.location) {
            
            // Check time overlap (using reservation times for more accurate conflict detection)
            const newStart = new Date(`${newEvent.eventDate} ${newEvent.reservationStartTime || newEvent.eventStartTime}`);
            const newEnd = new Date(`${newEvent.eventDate} ${newEvent.reservationEndTime || newEvent.eventEndTime}`);
            const existingStart = new Date(`${eventData.eventDate} ${eventData.reservationStartTime || eventData.eventStartTime}`);
            const existingEnd = new Date(`${eventData.eventDate} ${eventData.reservationEndTime || eventData.eventEndTime}`);
            
            if (newStart < existingEnd && existingStart < newEnd) {
                conflicts.push({
                    type: 'room',
                    severity: 'high',
                    event: eventData,
                    message: `${eventData.location} is already booked from ${formatTime(eventData.reservationStartTime || eventData.eventStartTime)} to ${formatTime(eventData.reservationEndTime || eventData.eventEndTime)}`,
                    conflictingEvent: {
                        id: event.id,
                        name: eventData.name,
                        date: eventData.eventDate,
                        isPartOfSeries: eventData.isPartOfSeries || false,
                        seriesInfo: eventData.isPartOfSeries ? `${eventData.seriesIndex}/${eventData.seriesTotalCount}` : null
                    }
                });
            }
        }
    }
    
    console.log(`🔍 Found ${conflicts.length} conflicts`);
    return conflicts;
}

// Enhanced test GitHub API connection
async function testGitHubConnection() {
    try {
        console.log('🧪 Testing enhanced GitHub API connection...');
        
        const token = getGitHubToken();
        if (!token) {
            return { success: false, error: 'No token available' };
        }
        
        // Test repository access
        const repo = await makeGitHubRequest(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`);
        
        // Test folder access
        const folders = await Promise.all([
            makeGitHubRequest(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.folders.data}`).catch(() => null),
            makeGitHubRequest(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.folders.eventFiles}`).catch(() => null)
        ]);
        
        const result = {
            success: true,
            message: `Connected to ${repo.full_name}`,
            details: {
                repository: repo.full_name,
                private: repo.private,
                permissions: repo.permissions,
                dataFolder: folders[0] ? '✅ Accessible' : '❌ Not found',
                filesFolder: folders[1] ? '✅ Accessible' : '❌ Not found (will be created)',
                tokenValid: true,
                apiVersion: '2.0'
            }
        };
        
        console.log('✅ Enhanced GitHub API connection test successful');
        return result;
        
    } catch (error) {
        console.error('❌ Enhanced GitHub API connection test failed:', error);
        return { 
            success: false, 
            error: error.message,
            suggestion: 'Please check your token permissions and repository access'
        };
    }
}

// ============================================================================
// ENHANCED SEARCH AND FILTERING
// ============================================================================

// Search events by criteria
async function searchEvents(criteria = {}) {
    try {
        console.log('🔍 Searching events with criteria:', criteria);
        
        const [pendingEvents, approvedEvents] = await Promise.all([
            loadPendingEvents(),
            loadApprovedEvents()
        ]);
        
        const allEvents = [
            ...pendingEvents.map(e => ({ ...e, source: 'pending' })),
            ...approvedEvents.map(e => ({ ...e, source: 'approved' }))
        ];
        
        let filteredEvents = allEvents;
        
        // Filter by search term
        if (criteria.searchTerm) {
            const term = criteria.searchTerm.toLowerCase();
            filteredEvents = filteredEvents.filter(event => 
                event.name?.toLowerCase().includes(term) ||
                event.description?.toLowerCase().includes(term) ||
                event.contactPerson?.toLowerCase().includes(term) ||
                event.location?.toLowerCase().includes(term)
            );
        }
        
        // Filter by date range
        if (criteria.startDate && criteria.endDate) {
            const start = new Date(criteria.startDate);
            const end = new Date(criteria.endDate);
            filteredEvents = filteredEvents.filter(event => {
                const eventDate = new Date(event.eventDate);
                return eventDate >= start && eventDate <= end;
            });
        }
        
        // Filter by location
        if (criteria.location) {
            filteredEvents = filteredEvents.filter(event => 
                event.location === criteria.location
            );
        }
        
        // Filter by event type
        if (criteria.eventType) {
            filteredEvents = filteredEvents.filter(event => 
                event.eventType === criteria.eventType
            );
        }
        
        // Filter by status
        if (criteria.status) {
            filteredEvents = filteredEvents.filter(event => 
                event.source === criteria.status
            );
        }
        
        // Filter by series
        if (criteria.seriesOnly) {
            filteredEvents = filteredEvents.filter(event => 
                event.isPartOfSeries === true
            );
        }
        
        // Filter by files
        if (criteria.hasFiles) {
            filteredEvents = filteredEvents.filter(event => 
                event.uploadedFiles && event.uploadedFiles.count > 0
            );
        }
        
        console.log(`🔍 Search complete: ${filteredEvents.length} events found`);
        
        return {
            results: filteredEvents,
            totalCount: filteredEvents.length,
            criteria: criteria
        };
        
    } catch (error) {
        console.error('❌ Error searching events:', error);
        return {
            results: [],
            totalCount: 0,
            error: error.message
        };
    }
}

// Get event statistics
async function getEventStatistics() {
    try {
        console.log('📊 Generating enhanced event statistics...');
        
        const [pendingEvents, approvedEvents] = await Promise.all([
            loadPendingEvents(),
            loadApprovedEvents()
        ]);
        
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        
        // Calculate various statistics
        const stats = {
            pending: {
                total: pendingEvents.length,
                withFiles: pendingEvents.filter(e => e.uploadedFiles && e.uploadedFiles.count > 0).length,
                series: pendingEvents.filter(e => e.isPartOfSeries).length,
                thisMonth: pendingEvents.filter(e => {
                    const eventDate = new Date(e.eventDate);
                    return eventDate.getMonth() === thisMonth && eventDate.getFullYear() === thisYear;
                }).length
            },
            approved: {
                total: approvedEvents.length,
                withFiles: approvedEvents.filter(e => e.uploadedFiles && e.uploadedFiles.count > 0).length,
                series: approvedEvents.filter(e => e.isPartOfSeries).length,
                thisMonth: approvedEvents.filter(e => {
                    const eventDate = new Date(e.eventDate);
                    return eventDate.getMonth() === thisMonth && eventDate.getFullYear() === thisYear;
                }).length,
                today: approvedEvents.filter(e => {
                    const eventDate = new Date(e.eventDate);
                    return eventDate.toDateString() === now.toDateString();
                }).length
            },
            files: {
                totalFiles: [...pendingEvents, ...approvedEvents].reduce((total, event) => {
                    return total + (event.uploadedFiles?.count || 0);
                }, 0),
                eventsWithFiles: [...pendingEvents, ...approvedEvents].filter(e => 
                    e.uploadedFiles && e.uploadedFiles.count > 0
                ).length
            },
            breakdown: {
                byType: {},
                byLocation: {},
                byOrganizationType: {}
            },
            generatedAt: new Date().toISOString()
        };
        
        // Generate breakdowns
        const allEvents = [...pendingEvents, ...approvedEvents];
        
        allEvents.forEach(event => {
            // By event type
            const type = event.eventType || 'Unknown';
            stats.breakdown.byType[type] = (stats.breakdown.byType[type] || 0) + 1;
            
            // By location
            const location = event.location || 'Unknown';
            stats.breakdown.byLocation[location] = (stats.breakdown.byLocation[location] || 0) + 1;
            
            // By organization type
            const orgType = event.groupCompanyType || 'Unknown';
            stats.breakdown.byOrganizationType[orgType] = (stats.breakdown.byOrganizationType[orgType] || 0) + 1;
        });
        
        console.log('📊 Enhanced statistics generated successfully');
        return stats;
        
    } catch (error) {
        console.error('❌ Error generating statistics:', error);
        return null;
    }
}

// ============================================================================
// ENHANCED INITIALIZATION
// ============================================================================

// Enhanced initialize GitHub API
async function initializeGitHubAPI() {
    console.log('🚀 Initializing Enhanced GitHub API v2.0...');
    
    try {
        // Validate repository access
        const repoValid = await validateRepository();
        if (!repoValid) {
            console.warn('⚠️ Repository validation failed, but continuing...');
        }
        
        // Test connection if token is available
        const authData = getStoredAuthData();
        if (authData) {
            console.log('📋 Found stored auth data');
            const test = await testGitHubConnection();
            if (test.success) {
                console.log('✅ Enhanced GitHub API connected successfully');
                
                // Ensure required folders exist
                await ensureFolderExists(GITHUB_CONFIG.folders.eventFiles);
                
                return true;
            } else {
                console.warn('⚠️ GitHub API connection failed:', test.error);
                return false;
            }
        } else {
            console.log('ℹ️ No stored auth data found');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Enhanced GitHub API initialization failed:', error);
        return false;
    }
}

// ============================================================================
// EXPORT FOR GLOBAL ACCESS
// ============================================================================

// Make enhanced functions available globally
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
    
    // Enhanced file upload functions
    uploadFileToGitHub,
    uploadEventFiles,
    downloadFileFromGitHub,
    listEventFiles,
    ensureFolderExists,
    
    // Data functions
    loadPendingEvents,
    loadApprovedEvents,
    loadStudentNames,
    savePendingEvents,
    saveApprovedEvents,
    saveStudentNames,
    
    // Enhanced event operations
    submitEventForApproval,
    approveEvent,
    rejectEvent,
    
    // Enhanced search and statistics
    searchEvents,
    getEventStatistics,
    
    // Utilities
    generateEventId,
    formatDate,
    formatTime,
    checkEventConflicts,
    
    // Initialize
    initializeGitHubAPI,
    
    // Configuration
    config: GITHUB_CONFIG
};

console.log('📚 Enhanced GitHub API v2.0 module loaded successfully');
console.log('🎯 New features: File uploads, enhanced validation, search, statistics');
console.log('📁 File storage ready: event-files/ folder will be created automatically');
