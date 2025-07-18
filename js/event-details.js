// event-details.js
// Handles viewing, editing, and approving event applications

(async function () {
  const eventId = getEventIdFromURL();
  if (!eventId) return alert("No event ID provided in URL");

  const form = document.getElementById("event-form");
  const saveBtn = document.getElementById("saveChangesBtn");
  const approveBtn = document.getElementById("approveBtn");

  let currentEvent = null;
  let source = null; // 'pending' or 'approved'

  // Load all resources needed to display the form
  await loadCategories();
  await loadManagers();
  await loadEventData();
  displayEvent();
  bindFormEvents();

  // ===== Functions =====
  function getEventIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("eventId");
  }

  async function loadEventData() {
    const pendingData = await GitHubAPI.readJSON("pending.json");
    const approvedData = await GitHubAPI.readJSON("approved.json");
    
    currentEvent = pendingData.find(ev => ev.id === eventId);
    source = "pending";
    
    if (!currentEvent) {
      currentEvent = approvedData.find(ev => ev.id === eventId);
      source = "approved";
    }
    
    if (!currentEvent) {
      alert("Event not found");
      return;
    }
  }

  function displayEvent() {
    document.getElementById("event-name").textContent = currentEvent.name;
    document.getElementById("event-date").textContent = currentEvent.eventDate;
    document.getElementById("event-location").textContent = currentEvent.location;
    document.getElementById("event-status").textContent = source.toUpperCase();

    for (const key in currentEvent) {
      const input = document.getElementById(key);
      if (input) input.value = currentEvent[key];
    }

    // Display attachments if any
    if (currentEvent.attachments && currentEvent.attachments.length > 0) {
      const container = document.getElementById("attachment-links");
      container.innerHTML = "";
      currentEvent.attachments.forEach(file => {
        const link = document.createElement("a");
        link.href = file.url;
        link.textContent = file.name;
        link.target = "_blank";
        container.appendChild(link);
        container.appendChild(document.createElement("br"));
      });
    }

    // Populate eventManagers multiselect
    const managerSelect = document.getElementById("eventManagers");
    if (Array.isArray(currentEvent.eventManagers)) {
      for (const option of managerSelect.options) {
        if (currentEvent.eventManagers.includes(option.value)) {
          option.selected = true;
        }
      }
    }
  }

  async function loadCategories() {
    const catData = await GitHubAPI.readJSON("categories.json");
    const select = document.getElementById("eventCategory");
    catData.categories.forEach(category => {
      const opt = document.createElement("option");
      opt.value = category;
      opt.textContent = category;
      select.appendChild(opt);
    });
  }

  async function loadManagers() {
    const mgrData = await GitHubAPI.readJSON("managers.json");
    const select = document.getElementById("eventManagers");
    mgrData.managers.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
  }

  function bindFormEvents() {
    saveBtn.addEventListener("click", handleSave);
    approveBtn.addEventListener("click", handleApprove);
  }

  async function handleSave() {
    const updatedEvent = buildFormData();
    const jsonFile = source === "pending" ? "pending.json" : "approved.json";
    const fullList = await GitHubAPI.readJSON(jsonFile);
    const index = fullList.findIndex(ev => ev.id === eventId);

    if (index !== -1) {
      fullList[index] = updatedEvent;
      await GitHubAPI.writeJSON(jsonFile, fullList);
      alert("Changes saved successfully.");
    }
  }

  async function handleApprove() {
    if (source !== "pending") return alert("Event is already approved.");
    
    const approvedList = await GitHubAPI.readJSON("approved.json");
    const pendingList = await GitHubAPI.readJSON("pending.json");

    const eventToApprove = buildFormData();
    approvedList.push(eventToApprove);
    const filteredPending = pendingList.filter(ev => ev.id !== eventId);

    await GitHubAPI.writeJSON("approved.json", approvedList);
    await GitHubAPI.writeJSON("pending.json", filteredPending);
    alert("Event approved and moved to approved.json");
    window.location.href = "admin.html";
  }

  function buildFormData() {
    const formData = { ...currentEvent };
    const fields = [
      "eventType", "estimatedAttendees", "totalPerformers", "estimatedBudget",
      "contactPerson", "contactEmail", "contactNumber", "groupCompanyType",
      "reservationStartTime", "reservationEndTime", "eventStartTime", "eventEndTime",
      "description", "eventCategory"
    ];

    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) formData[id] = el.value;
    });

    // Handle student workers (comma separated)
    const sw = document.getElementById("studentWorkers").value;
    formData.studentWorkers = sw ? sw.split(",").map(s => s.trim()) : [];

    // Handle event managers (multi-select)
    const emOptions = document.getElementById("eventManagers").selectedOptions;
    formData.eventManagers = Array.from(emOptions).map(opt => opt.value);

    return formData;
  }
})();

