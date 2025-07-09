// ============================================================================
// Conflict Detection UI Integration
// File: js/conflict-ui.js (Add this to your project)
// Step 14B - Real-time conflict checking with beautiful UI
// ============================================================================

// ============================================================================
// REAL-TIME CONFLICT CHECKING FOR FORMS
// ============================================================================

class ConflictUI {
    constructor() {
        this.isChecking = false;
        this.lastCheckData = null;
        this.conflictContainer = null;
        this.checkDelay = 1000; // 1 second delay after user stops typing
        this.checkTimeout = null;
        this.initialized = false;
    }

    // Initialize conflict checking for event form
    initializeForForm() {
        if (this.initialized) return;
        
        console.log('🔍 Initializing real-time conflict detection...');
        
        // Create conflict display container
        this.createConflictContainer();
        
        // Set up form field listeners
        this.setupFormListeners();
        
        // Add conflict checking to form submission
        this.enhanceFormSubmission();
        
        this.initialized = true;
        console.log('✅ Conflict detection UI initialized');
    }

    // Create container for displaying conflicts
    createConflictContainer() {
        const form = document.getElementById('eventForm');
        if (!form) return;
        
        // Create conflict display container
        this.conflictContainer = document.createElement('div');
        this.conflictContainer.id = 'conflictDisplay';
        this.conflictContainer.className = 'conflict-display-container';
        this.conflictContainer.style.display = 'none';
        
        // Insert before submit button
        const submitContainer = form.querySelector('.submit-container') || form.querySelector('.form-actions');
        if (submitContainer) {
            form.insertBefore(this.conflictContainer, submitContainer);
        } else {
            form.appendChild(this.conflictContainer);
        }
    }

    // Set up listeners on form fields
    setupFormListeners() {
        const fieldsToWatch = [
            'eventDate',
            'location', 
            'eventStartTime',
            'eventEndTime',
            'reservationStartTime',
            'reservationEndTime'
        ];
        
        fieldsToWatch.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('change', () => this.scheduleConflictCheck());
                field.addEventListener('blur', () => this.scheduleConflictCheck());
            }
        });
        
        // Also check when location is selected
        const locationField = document.getElementById('location');
        if (locationField) {
            locationField.addEventListener('change', () => this.scheduleConflictCheck());
        }
    }

    // Schedule conflict check with delay
    scheduleConflictCheck() {
        // Clear existing timeout
        if (this.checkTimeout) {
            clearTimeout(this.checkTimeout);
        }
        
        // Schedule new check
        this.checkTimeout = setTimeout(() => {
            this.runConflictCheck();
        }, this.checkDelay);
    }

    // Run conflict check
    async runConflictCheck() {
        if (this.isChecking) return;
        
        try {
            this.isChecking = true;
            this.showCheckingState();
            
            // Get current form data
            const formData = this.collectFormData();
            
            // Only check if we have minimum required data
            if (!this.hasMinimumData(formData)) {
                this.hideConflictDisplay();
                return;
            }
            
            // Skip check if data hasn't changed
            if (this.isSameData(formData, this.lastCheckData)) {
                return;
            }
            
            this.lastCheckData = { ...formData };
            
            // Run conflict detection
            const result = await window.ConflictDetector.detectConflicts(formData);
            
            // Display results
            this.displayConflictResults(result);
            
        } catch (error) {
            console.error('❌ Conflict check error:', error);
            this.showError('Unable to check for conflicts. Please try again.');
        } finally {
            this.isChecking = false;
        }
    }

    // Collect current form data
    collectFormData() {
        return {
            name: this.getFieldValue('eventName'),
            eventDate: this.getFieldValue('eventDate'),
            location: this.getFieldValue('location'),
            eventType: this.getFieldValue('eventType'),
            eventStartTime: this.getFieldValue('eventStartTime'),
            eventEndTime: this.getFieldValue('eventEndTime'),
            reservationStartTime: this.getFieldValue('reservationStartTime'),
            reservationEndTime: this.getFieldValue('reservationEndTime'),
            contactPerson: this.getFieldValue('contactPerson'),
            contactEmail: this.getFieldValue('contactEmail'),
            contactNumber: this.getFieldValue('contactNumber'),
            description: this.getFieldValue('description')
        };
    }

    // Get field value safely
    getFieldValue(fieldId) {
        const field = document.getElementById(fieldId);
        return field ? field.value : '';
    }

    // Check if form has minimum data for conflict checking
    hasMinimumData(formData) {
        return formData.eventDate && formData.location && 
               (formData.eventStartTime || formData.reservationStartTime);
    }

    // Check if data is the same as last check
    isSameData(data1, data2) {
        if (!data2) return false;
        
        const keys = ['eventDate', 'location', 'eventStartTime', 'eventEndTime', 'reservationStartTime', 'reservationEndTime'];
        return keys.every(key => data1[key] === data2[key]);
    }

    // Show checking state
    showCheckingState() {
        if (!this.conflictContainer) return;
        
        this.conflictContainer.style.display = 'block';
        this.conflictContainer.innerHTML = `
            <div class="conflict-checking">
                <div class="conflict-spinner"></div>
                <span>Checking for conflicts...</span>
            </div>
        `;
    }

    // Display conflict results
    displayConflictResults(result) {
        if (!this.conflictContainer) return;
        
        if (!result.hasConflicts && !result.hasWarnings) {
            this.showSuccess('✅ No conflicts detected');
            return;
        }
        
        let html = '<div class="conflict-results">';
        
        // Display conflicts
        if (result.hasConflicts) {
            html += '<div class="conflict-section conflicts">';
            html += '<h4 class="conflict-title">⚠️ Conflicts Found</h4>';
            
            result.conflicts.forEach(conflict => {
                html += this.createConflictItem(conflict, 'conflict');
            });
            
            html += '</div>';
        }
        
        // Display warnings
        if (result.hasWarnings) {
            html += '<div class="conflict-section warnings">';
            html += '<h4 class="conflict-title">⚠️ Warnings</h4>';
            
            result.warnings.forEach(warning => {
                html += this.createConflictItem(warning, 'warning');
            });
            
            html += '</div>';
        }
        
        // Display suggestions
        if (result.suggestions.length > 0) {
            html += '<div class="conflict-section suggestions">';
            html += '<h4 class="conflict-title">💡 Suggestions</h4>';
            
            result.suggestions.forEach((suggestion, index) => {
                html += this.createSuggestionItem(suggestion, index);
            });
            
            html += '</div>';
        }
        
        html += '</div>';
        
        this.conflictContainer.style.display = 'block';
        this.conflictContainer.innerHTML = html;
        
        // Add event listeners for suggestion buttons
        this.setupSuggestionListeners();
    }

    // Create conflict/warning item
    createConflictItem(item, type) {
        const severity = item.severity || 'medium';
        const icon = type === 'conflict' ? '🚫' : '⚠️';
        
        return `
            <div class="conflict-item ${type} severity-${severity}">
                <span class="conflict-icon">${icon}</span>
                <div class="conflict-content">
                    <div class="conflict-message">${item.message}</div>
                    ${item.conflictingEvent ? this.createConflictDetails(item.conflictingEvent) : ''}
                </div>
            </div>
        `;
    }

    // Create conflict details
    createConflictDetails(conflictingEvent) {
        return `
            <div class="conflict-details">
                <strong>Conflicting Event:</strong> ${conflictingEvent.name}<br>
                <strong>Time:</strong> ${conflictingEvent.startTime} - ${conflictingEvent.endTime}<br>
                <strong>Status:</strong> ${conflictingEvent.source === 'approved' ? 'Approved' : 'Pending Approval'}
            </div>
        `;
    }

    // Create suggestion item
    createSuggestionItem(suggestion, index) {
        let content = `
            <div class="suggestion-item">
                <div class="suggestion-header">
                    <span class="suggestion-title">${suggestion.title}</span>
                </div>
                <div class="suggestion-content">
        `;
        
        if (suggestion.type === 'location') {
            content += '<div class="suggestion-options">';
            suggestion.options.forEach((location, optIndex) => {
                content += `
                    <button class="suggestion-btn location-suggestion" 
                            data-suggestion="${index}" 
                            data-option="${optIndex}"
                            data-value="${location}">
                        📍 ${location}
                    </button>
                `;
            });
            content += '</div>';
            
        } else if (suggestion.type === 'time') {
            content += '<div class="suggestion-options">';
            suggestion.options.forEach((slot, optIndex) => {
                content += `
                    <button class="suggestion-btn time-suggestion" 
                            data-suggestion="${index}" 
                            data-option="${optIndex}"
                            data-start="${slot.timeValue}">
                        ⏰ ${slot.startTime} - ${slot.endTime}
                    </button>
                `;
            });
            content += '</div>';
            
        } else if (suggestion.type === 'date') {
            content += '<div class="suggestion-options">';
            suggestion.options.forEach((dateOpt, optIndex) => {
                content += `
                    <button class="suggestion-btn date-suggestion" 
                            data-suggestion="${index}" 
                            data-option="${optIndex}"
                            data-date="${dateOpt.date.toISOString().split('T')[0]}">
                        📅 ${dateOpt.formatted} (${dateOpt.dayOfWeek})
                    </button>
                `;
            });
            content += '</div>';
            
        } else if (suggestion.type === 'time_adjustment') {
            content += `
                <div class="suggestion-message">${suggestion.message}</div>
                <button class="suggestion-btn time-adjustment-suggestion" 
                        data-suggestion="${index}"
                        data-field="eventStartTime"
                        data-value="${suggestion.suggestedValue}">
                    Apply Suggestion
                </button>
            `;
        }
        
        content += `
                </div>
            </div>
        `;
        
        return content;
    }

    // Setup suggestion button listeners
    setupSuggestionListeners() {
        // Location suggestions
        this.conflictContainer.querySelectorAll('.location-suggestion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const location = e.target.dataset.value;
                this.applyLocationSuggestion(location);
            });
        });
        
        // Time suggestions
        this.conflictContainer.querySelectorAll('.time-suggestion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const startTime = e.target.dataset.start;
                this.applyTimeSuggestion(startTime);
            });
        });
        
        // Date suggestions
        this.conflictContainer.querySelectorAll('.date-suggestion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const date = e.target.dataset.date;
                this.applyDateSuggestion(date);
            });
        });
        
        // Time adjustment suggestions
        this.conflictContainer.querySelectorAll('.time-adjustment-suggestion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const field = e.target.dataset.field;
                const value = e.target.dataset.value;
                this.applyTimeAdjustmentSuggestion(field, value);
            });
        });
    }

    // Apply location suggestion
    applyLocationSuggestion(location) {
        const locationField = document.getElementById('location');
        if (locationField) {
            locationField.value = location;
            this.showSuccessMessage(`Location updated to: ${location}`);
            this.scheduleConflictCheck();
        }
    }

    // Apply time suggestion
    applyTimeSuggestion(startTime) {
        const startField = document.getElementById('eventStartTime');
        const reservationStartField = document.getElementById('reservationStartTime');
        
        if (startField) {
            startField.value = startTime;
            
            // Calculate end time (assuming 2-hour event)
            const start = new Date(`2000-01-01 ${startTime}`);
            const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
            const endTime = end.toTimeString().slice(0, 5);
            
            const endField = document.getElementById('eventEndTime');
            if (endField) {
                endField.value = endTime;
            }
            
            // Update reservation times if they exist
            if (reservationStartField) {
                const reservationStart = new Date(start.getTime() - 15 * 60 * 1000);
                const reservationEnd = new Date(end.getTime() + 15 * 60 * 1000);
                
                reservationStartField.value = reservationStart.toTimeString().slice(0, 5);
                
                const reservationEndField = document.getElementById('reservationEndTime');
                if (reservationEndField) {
                    reservationEndField.value = reservationEnd.toTimeString().slice(0, 5);
                }
            }
            
            this.showSuccessMessage(`Time updated to: ${startTime} - ${endTime}`);
            this.scheduleConflictCheck();
        }
    }

    // Apply date suggestion
    applyDateSuggestion(date) {
        const dateField = document.getElementById('eventDate');
        if (dateField) {
            dateField.value = date;
            this.showSuccessMessage(`Date updated to: ${new Date(date).toLocaleDateString()}`);
            this.scheduleConflictCheck();
        }
    }

    // Apply time adjustment suggestion
    applyTimeAdjustmentSuggestion(field, value) {
        const fieldElement = document.getElementById(field);
        if (fieldElement) {
            fieldElement.value = value;
            this.showSuccessMessage(`${field} updated`);
            this.scheduleConflictCheck();
        }
    }

    // Show success state
    showSuccess(message) {
        if (!this.conflictContainer) return;
        
        this.conflictContainer.style.display = 'block';
        this.conflictContainer.innerHTML = `
            <div class="conflict-success">
                <span class="success-icon">✅</span>
                <span>${message}</span>
            </div>
        `;
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.hideConflictDisplay();
        }, 3000);
    }

    // Show success message temporarily
    showSuccessMessage(message) {
        // Create temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'conflict-success-message';
        successDiv.textContent = message;
        
        document.body.appendChild(successDiv);
        
        // Animate in
        setTimeout(() => {
            successDiv.classList.add('show');
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            successDiv.classList.remove('show');
            setTimeout(() => {
                if (successDiv.parentNode) {
                    successDiv.parentNode.removeChild(successDiv);
                }
            }, 300);
        }, 3000);
    }

    // Show error
    showError(message) {
        if (!this.conflictContainer) return;
        
        this.conflictContainer.style.display = 'block';
        this.conflictContainer.innerHTML = `
            <div class="conflict-error">
                <span class="error-icon">❌</span>
                <span>${message}</span>
            </div>
        `;
    }

    // Hide conflict display
    hideConflictDisplay() {
        if (this.conflictContainer) {
            this.conflictContainer.style.display = 'none';
        }
    }

    // Enhance form submission
    enhanceFormSubmission() {
        const form = document.getElementById('eventForm');
        if (!form) return;
        
        // Store original submit handler
        const originalSubmitHandler = window.handleFormSubmission;
        
        // Create enhanced submit handler
        window.handleFormSubmission = async (event) => {
            event.preventDefault();
            
            // Run final conflict check
            const formData = this.collectFormData();
            const result = await window.ConflictDetector.detectConflicts(formData);
            
            // If there are conflicts, ask for confirmation
            if (result.hasConflicts) {
                const conflictMessages = result.conflicts.map(c => c.message).join('\n');
                const proceed = confirm(
                    `⚠️ CONFLICTS DETECTED:\n\n${conflictMessages}\n\nDo you want to submit anyway?\n\n(This may cause scheduling issues)`
                );
                
                if (!proceed) {
                    this.displayConflictResults(result);
                    return;
                }
            }
            
            // Proceed with original submission
            if (originalSubmitHandler) {
                await originalSubmitHandler(event);
            }
        };
    }
}

// ============================================================================
// ADMIN PANEL INTEGRATION
// ============================================================================

class AdminConflictManager {
    static async checkPendingEventConflicts() {
        console.log('🔍 Checking conflicts in pending events...');
        
        try {
            const pendingEvents = await window.GitHubAPI.loadPendingEvents();
            const conflictResults = [];
            
            for (const event of pendingEvents) {
                const eventData = event.eventData || event;
                const result = await window.ConflictDetector.detectConflicts(eventData, event.id);
                
                if (result.hasConflicts || result.hasWarnings) {
                    conflictResults.push({
                        event: event,
                        conflicts: result
                    });
                }
            }
            
            return conflictResults;
            
        } catch (error) {
            console.error('❌ Error checking pending event conflicts:', error);
            return [];
        }
    }
    
    static displayAdminConflictSummary(conflictResults) {
        if (conflictResults.length === 0) {
            return '<div class="admin-conflict-summary success">✅ No conflicts in pending events</div>';
        }
        
        let html = `<div class="admin-conflict-summary warning">`;
        html += `<h4>⚠️ ${conflictResults.length} Pending Event${conflictResults.length > 1 ? 's' : ''} with Conflicts</h4>`;
        
        conflictResults.forEach(({ event, conflicts }) => {
            const eventData = event.eventData || event;
            html += `
                <div class="admin-conflict-item">
                    <strong>${eventData.name}</strong> - ${new Date(eventData.eventDate).toLocaleDateString()}
                    <ul>
            `;
            
            conflicts.conflicts.forEach(conflict => {
                html += `<li class="conflict">${conflict.message}</li>`;
            });
            
            conflicts.warnings.forEach(warning => {
                html += `<li class="warning">${warning.message}</li>`;
            });
            
            html += `</ul></div>`;
        });
        
        html += '</div>';
        return html;
    }
}

// ============================================================================
// CSS STYLES FOR CONFLICT UI
// ============================================================================

function injectConflictStyles() {
    const styles = `
        <style>
        /* Conflict Display Container */
        .conflict-display-container {
            margin: 20px 0;
            padding: 0;
            border-radius: 8px;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
        }
        
        /* Checking State */
        .conflict-checking {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px;
            color: #6c757d;
        }
        
        .conflict-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid #e9ecef;
            border-top: 2px solid var(--wm-primary-green);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Success State */
        .conflict-success {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px;
            background: #d4edda;
            color: #155724;
            border-left: 4px solid #28a745;
        }
        
        /* Error State */
        .conflict-error {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px;
            background: #f8d7da;
            color: #721c24;
            border-left: 4px solid #dc3545;
        }
        
        /* Conflict Results */
        .conflict-results {
            padding: 15px;
        }
        
        .conflict-section {
            margin-bottom: 20px;
        }
        
        .conflict-section:last-child {
            margin-bottom: 0;
        }
        
        .conflict-title {
            margin: 0 0 10px 0;
            color: var(--wm-primary-green);
            font-size: 1.1rem;
        }
        
        /* Conflict Items */
        .conflict-item {
            display: flex;
            gap: 10px;
            padding: 10px;
            margin-bottom: 8px;
            border-radius: 6px;
            border-left: 4px solid transparent;
        }
        
        .conflict-item.conflict {
            background: #f8d7da;
            border-left-color: #dc3545;
        }
        
        .conflict-item.warning {
            background: #fff3cd;
            border-left-color: #ffc107;
        }
        
        .conflict-item.severity-high {
            border-left-width: 6px;
        }
        
        .conflict-icon {
            font-size: 1.2rem;
            margin-top: 2px;
        }
        
        .conflict-content {
            flex: 1;
        }
        
        .conflict-message {
            font-weight: 500;
            margin-bottom: 5px;
        }
        
        .conflict-details {
            font-size: 0.9rem;
            color: #6c757d;
            margin-top: 5px;
        }
        
        /* Suggestions */
        .suggestion-item {
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 10px;
        }
        
        .suggestion-header {
            margin-bottom: 10px;
        }
        
        .suggestion-title {
            font-weight: 600;
            color: var(--wm-primary-green);
        }
        
        .suggestion-options {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        
        .suggestion-btn {
            background: var(--wm-primary-green);
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s ease;
        }
        
        .suggestion-btn:hover {
            background: var(--wm-primary-green-dark);
            transform: translateY(-1px);
        }
        
        .suggestion-message {
            margin-bottom: 10px;
            color: #495057;
        }
        
        /* Success Message */
        .conflict-success-message {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(400px);
            transition: transform 0.3s ease;
            z-index: 10000;
            font-weight: 500;
        }
        
        .conflict-success-message.show {
            transform: translateX(0);
        }
        
        /* Admin Conflict Summary */
        .admin-conflict-summary {
            margin: 15px 0;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid transparent;
        }
        
        .admin-conflict-summary.success {
            background: #d4edda;
            color: #155724;
            border-left-color: #28a745;
        }
        
        .admin-conflict-summary.warning {
            background: #fff3cd;
            color: #856404;
            border-left-color: #ffc107;
        }
        
        .admin-conflict-item {
            margin: 10px 0;
            padding: 10px;
            background: rgba(255,255,255,0.7);
            border-radius: 4px;
        }
        
        .admin-conflict-item ul {
            margin: 5px 0 0 20px;
            padding: 0;
        }
        
        .admin-conflict-item li.conflict {
            color: #dc3545;
        }
        
        .admin-conflict-item li.warning {
            color: #856404;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            .suggestion-options {
                flex-direction: column;
            }
            
            .suggestion-btn {
                width: 100%;
                text-align: center;
            }
            
            .conflict-success-message {
                right: 10px;
                left: 10px;
                transform: translateY(-100px);
            }
            
            .conflict-success-message.show {
                transform: translateY(0);
            }
        }
        </style>
    `;
    
    // Inject styles if not already present
    if (!document.getElementById('conflict-ui-styles')) {
        const styleElement = document.createElement('div');
        styleElement.id = 'conflict-ui-styles';
        styleElement.innerHTML = styles;
        document.head.appendChild(styleElement);
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Create global instances
window.ConflictUI = new ConflictUI();
window.AdminConflictManager = AdminConflictManager;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Inject styles
    injectConflictStyles();
    
    // Initialize for event form
    if (document.getElementById('eventForm')) {
        window.ConflictUI.initializeForForm();
        console.log('🔍 Conflict detection UI initialized for event form');
    }
});

console.log('🎯 Conflict Detection UI Integration loaded successfully');
console.log('✨ Features: Real-time checking, Smart suggestions, Beautiful conflict display');
