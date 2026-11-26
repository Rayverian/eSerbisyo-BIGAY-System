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

function showMessage(text, isError = false) {
  statusMsg.textContent = text;
  statusMsg.style.color = isError ? '#ff6b6b' : '#0c1d4f';
}

async function uploadFile(file) {
  const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage
    .from('complaint-photos')
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  return db.storage.from('complaint-photos').getPublicUrl(path).data.publicUrl;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMessage('');

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