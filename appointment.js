document.getElementById("complain").addEventListener("click", () => {
  window.location.href = "complaint.html";
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

// Block past dates and past times on today's date
const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");

function setMinDateTime() {
  const now = new Date();
  const today = now.toLocaleDateString("en-CA");
  dateInput.min = today;

  if (dateInput.value === today) {
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    timeInput.min = `${hours}:${minutes}`;
  } else {
    timeInput.removeAttribute("min");
  }
}

setMinDateTime();
dateInput.addEventListener("change", setMinDateTime);
timeInput.addEventListener("focus", setMinDateTime);


document.getElementById("appointmentForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const claimingDate = document.getElementById("date").value;
  const timeSlot = document.getElementById("time").value;
  const now = new Date();
  const today = now.toLocaleDateString("en-CA");

  if (claimingDate < today) {
    alert("Claiming date cannot be in the past.");
    return;
  }

  if (claimingDate === today && timeSlot) {
    const [hours, minutes] = timeSlot.split(":").map(Number);
    const selectedTime = new Date();
    selectedTime.setHours(hours, minutes, 0, 0);

    if (selectedTime <= now) {
      alert("Claiming time cannot be in the past.");
      return;
    }
  }

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;

  // 1. Upload the ID file
  let idPath = null;
  const file = document.getElementById("validId").files[0];

  if (file) {
    const ext = file.name.split(".").pop();
    idPath = crypto.randomUUID() + "." + ext;

    const { error: uploadError } = await db.storage
      .from("valid-ids")
      .upload(idPath, file);

    if (uploadError) {
      alert("ID upload failed: " + uploadError.message);
      submitBtn.disabled = false;
      return;
    }
  }

  // 2. Save the form data
  const { error } = await db.from("document_requests").insert({
    full_name: document.getElementById('fullname').value,
    age: document.getElementById('age').value || null,
    date_of_birth: document.getElementById('dob').value || null,
    contact_number: document.getElementById('contact').value,
    email: document.getElementById('email_add').value,
    sitio: document.getElementById('sitio').value,
    civil_status: document.getElementById('status').value,
    document_type: document.getElementById('document').value,
    purpose: document.getElementById('purpose').value,
    valid_id_path: idPath,
    claiming_date: document.getElementById('date').value,
    time_slot: document.getElementById('time').value || null,
  });

  submitBtn.disabled = false;

  if (error) {
    console.error(error);
    alert("Error: " + error.message);
  } else {
    alert("Request submitted!");
    e.target.reset();
    setMinDateTime();
  }
})