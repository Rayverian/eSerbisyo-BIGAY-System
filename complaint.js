// Navigation buttons (using optional chaining so it won't crash if run on other pages)
document.getElementById("request")?.addEventListener("click", () => {
  window.location.href = "docreq.html";
});

document.getElementById("services")?.addEventListener("click", () => {
  window.location.href = "services.html";
});

document.getElementById("home")?.addEventListener("click", () => {
  window.location.href = "home.html";
});

document.getElementById("dashboard")?.addEventListener("click", () => {
  window.location.href = "admin-login.html";
});

const form      = document.getElementById('complainForm');
const submitBtn = document.getElementById('submitBtn');
const statusMsg = document.getElementById('formStatus');
const dateInput = document.getElementById('date');
const fileInput = document.getElementById('photo');

// ----- "Others" incident category -----
const categorySelect = document.getElementById('status');
const otherGroup     = document.getElementById('otherIncidentGroup');
const otherInput     = document.getElementById('otherIncident');

function toggleOtherIncident() {
  const isOther = categorySelect.value === 'Others';
  otherGroup.hidden = !isOther;
  otherInput.required = isOther;
  if (!isOther) otherInput.value = '';
}

categorySelect.addEventListener('change', toggleOtherIncident);
// --------------------------------------

// Compute local YYYY-MM-DD to avoid UTC timezone off-by-one shifts
const now = new Date();
const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  .toISOString()
  .split('T')[0];
const currentYear = now.getFullYear();
const minYear = 1900;

dateInput.min = `${minYear}-01-01`;
dateInput.max = localToday;

function showMessage(text, isError = false) {
  statusMsg.textContent = text;
  statusMsg.style.color = isError ? '#ff6b6b' : '#0c1d4f';
}

function validateIncidentDate(dateStr) {
  if (!dateStr) {
    return 'Please select the date of the incident.';
  }

  // Verify strict 4-digit year format (YYYY-MM-DD)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    return 'Please enter a complete, valid date.';
  }

  const year = parseInt(match[1], 10);

  // Reject incomplete years like 0002 or 0236
  if (year < minYear || year > currentYear) {
    return `Please enter a complete 4-digit year between ${minYear} and ${currentYear}.`;
  }

  // Reject dates after today
  if (dateStr > localToday) {
    return 'Date of incident cannot be in the future.';
  }

  return null;
}

function validateFile(file) {
  if (!file) return null; // Optional field

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const maxBytes = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type. Only JPG, PNG, WEBP, or PDF files are allowed.';
  }
  if (file.size === 0) {
    return 'The selected file is empty.';
  }
  if (file.size > maxBytes) {
    return 'File must be 5MB or smaller.';
  }

  return null;
}

// Validate immediately when a file is chosen
fileInput.addEventListener('change', () => {
  const fileError = validateFile(fileInput.files[0]);
  if (fileError) {
    showMessage(fileError, true);
    fileInput.value = '';
  } else {
    showMessage('');
  }
});

// Fallback ID generator if crypto.randomUUID() is unavailable on plain HTTP
function generateUniqueId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

async function uploadFile(file) {
  const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${generateUniqueId()}.${ext}`;
  const { error } = await db.storage
    .from('complaint-photos')
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  return db.storage.from('complaint-photos').getPublicUrl(path).data.publicUrl;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMessage('');

  // 1. Validate Date & Year
  const dateError = validateIncidentDate(dateInput.value);
  if (dateError) {
    dateInput.focus();
    return showMessage(dateError, true);
  }

  // 2. Validate File
  const file = fileInput.files[0];
  const fileError = validateFile(file);
  if (fileError) {
    fileInput.focus();
    return showMessage(fileError, true);
  }

  // 3. Resolve incident category (include the typed text when "Others")
  let incidentCategory = categorySelect.value;
  if (incidentCategory === 'Others') {
    const otherText = otherInput.value.trim();
    if (!otherText) {
      otherInput.focus();
      return showMessage('Please specify the other incident.', true);
    }
    incidentCategory = `Others: ${otherText}`;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'SUBMITTING...';

  try {
    const fileUrl = file ? await uploadFile(file) : null;

    const { error } = await db.from('complaints').insert({
      incident_category:              incidentCategory,
      sitio:                          document.getElementById('sitio').value,
      specific_landmark_address:      document.getElementById('landmark').value.trim(),
      email:                          document.getElementById('email').value.trim() || null,
      date_of_incident:               dateInput.value,
      approximate_time:               document.getElementById('time').value || null,
      incident_narrative_description: document.getElementById('descriptions').value.trim(),
      photo_evidence:                 fileUrl
    });
    if (error) throw error;

    form.reset();
    toggleOtherIncident();
    showMessage('Your report was submitted. Thank you!');
  } catch (err) {
    console.error(err);
    showMessage('Something went wrong. Please try again.', true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'SUBMIT';
  }
});
