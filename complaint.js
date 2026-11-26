document.getElementById("request").addEventListener("click", () => {
  window.location.href = "docreq.html";
});

document.getElementById("services").addEventListener("click", () => {
  window.location.href = "services.html";
});

document.getElementById("home").addEventListener("click", () => {
  window.location.href = "home.html";
});

document.getElementById("dashboard").addEventListener("click", () => {
  window.location.href = "admin-login.html";
});


const form      = document.getElementById('complainForm');
const submitBtn = document.getElementById('submitBtn');
const statusMsg = document.getElementById('formStatus');

// ----- date validation setup (new) -----
const dateInput = document.getElementById('date');

function todayLocal() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return ${d.getFullYear()}-${m}-${day};
}

dateInput.min = '2000-01-01';
dateInput.max = todayLocal();
// ---------------------------------------

function showMessage(text, isError = false) {
  statusMsg.textContent = text;
  statusMsg.style.color = isError ? '#ff6b6b' : '#0c1d4f';
}

async function uploadFile(file) {
  const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = ${crypto.randomUUID()}.${ext};
  const { error } = await db.storage
    .from('complaint-photos')
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  return db.storage.from('complaint-photos').getPublicUrl(path).data.publicUrl;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMessage('');

  // ----- date check (new) -----
  const dateValue = dateInput.value;
  const year = parseInt(dateValue.split('-')[0], 10);

  if (!dateValue || isNaN(Date.parse(dateValue)) || year < 2000 || String(year).length !== 4) {
    return showMessage('Please enter a valid date of incident.', true);
  }
  if (dateValue > todayLocal()) {
    return showMessage('Date of incident cannot be in the future.', true);
  }
  // ----------------------------

  const file = document.getElementById('photo').files[0];
  if (file && file.size > 5 * 1024 * 1024) {
    return showMessage('File must be 5MB or smaller.', true);
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'SUBMITTING...';

  try {
    const fileUrl = file ? await uploadFile(file) : null;

    const { error } = await db.from('complaints').insert({
      incident_category:              document.getElementById('status').value,
      sitio:                          document.getElementById('sitio').value,
      specific_landmark_address:      document.getElementById('landmark').value.trim(),
      email:                          document.getElementById('email').value.trim() || null,
      date_of_incident:               document.getElementById('date').value,
      approximate_time:               document.getElementById('time').value || null,
      incident_narrative_description: document.getElementById('descriptions').value.trim(),
      photo_evidence:                 fileUrl
    });
    if (error) throw error;

    form.reset();
    showMessage('Your report was submitted. Thank you!');
  } catch (err) {
    console.error(err);
    showMessage('Something went wrong. Please try again.', true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'SUBMIT';
  }
});
