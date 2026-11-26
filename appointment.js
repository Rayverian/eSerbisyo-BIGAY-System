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

document.getElementById("request").addEventListener("click", () => {
  window.location.href = "docreq.html";
});

const dobInput   = document.getElementById("dob");
const dateInput  = document.getElementById("date");
const timeInput  = document.getElementById("time");
const fileInput  = document.getElementById("validId");
const submitBtn  = document.getElementById("submitBtn");

function getLocalToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

// Configure Date of Birth bounds (1900 to today) & Claiming Date bounds (today to next year)
function configureDateLimits() {
  const now = new Date();
  const today = getLocalToday();
  const currentYear = now.getFullYear();

  dobInput.min = "1900-01-01";
  dobInput.max = today;

  dateInput.min = today;
  dateInput.max = `${currentYear + 1}-12-31`;

  if (dateInput.value === today) {
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    timeInput.min = `${hours}:${minutes}`;
  } else {
    timeInput.removeAttribute("min");
  }
}

configureDateLimits();
dateInput.addEventListener("change", configureDateLimits);
timeInput.addEventListener("focus", configureDateLimits);

function validateDateOfBirth(dobStr) {
  if (!dobStr) {
    return "Please enter your date of birth.";
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobStr);
  if (!match) {
    return "Date of birth must have a complete 4-digit year.";
  }

  const year = parseInt(match[1], 10);
  const today = getLocalToday();
  const currentYear = new Date().getFullYear();

  if (year < 1900 || year > currentYear) {
    return `Birth year must be a 4-digit year between 1900 and ${currentYear}.`;
  }

  if (dobStr > today) {
    return "Date of birth cannot be in the future.";
  }

  return null;
}

function validateClaimingDate(claimingStr) {
  if (!claimingStr) {
    return "Please select a claiming date.";
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(claimingStr);
  if (!match) {
    return "Claiming date must have a complete 4-digit year.";
  }

  const year = parseInt(match[1], 10);
  const today = getLocalToday();
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + 1;

  if (year < currentYear || year > maxYear) {
    return `Claiming year must be a 4-digit year between ${currentYear} and ${maxYear}.`;
  }

  if (claimingStr < today) {
    return "Claiming date cannot be in the past.";
  }

  return null;
}

function validateValidIdFile(file) {
  if (!file) {
    return "Please upload a valid ID.";
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const maxBytes = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return "Invalid file type. Only JPG, PNG, WEBP, or PDF files are allowed.";
  }
  if (file.size === 0) {
    return "The selected file is empty.";
  }
  if (file.size > maxBytes) {
    return "Valid ID file must be 5MB or smaller.";
  }

  return null;
}

// Validate immediately when a user selects an ID file
fileInput.addEventListener("change", () => {
  const fileError = validateValidIdFile(fileInput.files[0]);
  if (fileError) {
    alert(fileError);
    fileInput.value = "";
  }
});

document.getElementById("appointmentForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // 1. Validate Date of Birth
  const dobError = validateDateOfBirth(dobInput.value);
  if (dobError) {
    dobInput.focus();
    alert(dobError);
    return;
  }

  // 2. Validate Claiming Date & Time
  const claimingDate = dateInput.value;
  const claimingError = validateClaimingDate(claimingDate);
  if (claimingError) {
    dateInput.focus();
    alert(claimingError);
    return;
  }

  const timeSlot = timeInput.value;
  const now = new Date();
  const today = getLocalToday();

  if (claimingDate === today && timeSlot) {
    const [hours, minutes] = timeSlot.split(":").map(Number);
    const selectedTime = new Date();
    selectedTime.setHours(hours, minutes, 0, 0);

    if (selectedTime <= now) {
      timeInput.focus();
      alert("Claiming time cannot be in the past.");
      return;
    }
  }

  // 3. Validate Valid ID File
  const file = fileInput.files[0];
  const fileError = validateValidIdFile(file);
  if (fileError) {
    fileInput.focus();
    alert(fileError);
    return;
  }

  submitBtn.disabled = true;

  try {
    // 4. Upload the Valid ID file
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const idPath = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await db.storage
      .from("valid-ids")
      .upload(idPath, file, { contentType: file.type });

    if (uploadError) {
      throw new Error("ID upload failed: " + uploadError.message);
    }

    // 5. Save the form data
    const { error } = await db.from("document_requests").insert({
      full_name:      document.getElementById("fullname").value.trim(),
      age:            document.getElementById("age").value || null,
      date_of_birth:  dobInput.value,
      contact_number: document.getElementById("contact").value.trim(),
      email:          document.getElementById("email_add").value.trim(),
      sitio:          document.getElementById("sitio").value,
      civil_status:   document.getElementById("status").value,
      document_type:  document.getElementById("document").value,
      purpose:        document.getElementById("purpose").value,
      valid_id_path:  idPath,
      claiming_date:  claimingDate,
      time_slot:      timeSlot || null,
    });

    if (error) {
      throw new Error(error.message);
    }

    alert("Request submitted!");
    e.target.reset();
    configureDateLimits();
  } catch (err) {
    console.error(err);
    alert("Error: " + err.message);
  } finally {
    submitBtn.disabled = false;
  }
});
