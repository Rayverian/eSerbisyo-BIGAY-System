let allRequests = [];      // all the requests from supabase
let currentFilter = "All"; // which filter button is selected
let selectedId = null;     // the request we are viewing

// ---------- get the requests from supabase ----------
async function loadRequests() {
  const { data, error } = await db
    .from("document_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    alert("Could not load requests: " + error.message);
    return;
  }

  allRequests = data;
  showTable();

  // if a request was open, refresh its details too
  if (selectedId) {
    showDetails(selectedId);
  }
}

// ---------- show the table ----------
function showTable() {
  const rows = document.getElementById("requestRows");
  rows.innerHTML = "";

  let count = 0;

  for (let i = 0; i < allRequests.length; i++) {
    const r = allRequests[i];

    // skip if it doesn't match the filter
    if (currentFilter !== "All" && r.status !== currentFilter) {
      continue;
    }
    count++;

    rows.innerHTML += `
      <tr>
        <td>${safe(r.full_name)}<br><small>${safe(r.email)}</small></td>
        <td>${safe(r.document_type)}</td>
        <td>${safe(r.claiming_date)} ${safe(r.time_slot)}</td>
        <td><span class="badge ${statusClass(r.status)}">${safe(r.status)}</span></td>
        <td><button class="btn" onclick="showDetails('${r.id}')">View</button></td>
      </tr>`;
  }

  if (count === 0) {
    rows.innerHTML = `<tr><td colspan="5" class="empty">No requests found.</td></tr>`;
  }
}

// ---------- filter buttons ----------
const filterButtons = document.querySelectorAll("#filters button");

filterButtons.forEach(function (btn) {
  btn.addEventListener("click", function () {
    currentFilter = btn.dataset.status;

    filterButtons.forEach(function (b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");

    showTable();
  });
});

// ---------- show details of one request ----------
function showDetails(id) {
  selectedId = id;

  let r = null;
  for (let i = 0; i < allRequests.length; i++) {
    if (String(allRequests[i].id) === String(id)) {
      r = allRequests[i];
    }
  }
  if (r === null) {
    return;
  }

  const box = document.getElementById("detailBox");
  box.style.display = "block";

  let remarksHtml = "";
  if (r.admin_remarks) {
    remarksHtml = `<div><p>Remarks</p><span>${safe(r.admin_remarks)}</span></div>`;
  }

  box.innerHTML = `
    <h2>${safe(r.full_name)} <span class="badge ${statusClass(r.status)}">${safe(r.status)}</span></h2>

    <div class="detail-grid">
      <div><p>Document</p><span>${safe(r.document_type)}</span></div>
      <div><p>Purpose</p><span>${safe(r.purpose)}</span></div>
      <div><p>Email</p><span>${safe(r.email)}</span></div>
      <div><p>Contact Number</p><span>${safe(r.contact_number)}</span></div>
      <div><p>Sitio</p><span>${safe(r.sitio)}</span></div>
      <div><p>Civil Status</p><span>${safe(r.civil_status)}</span></div>
      <div><p>Age</p><span>${safe(r.age)}</span></div>
      <div><p>Date of Birth</p><span>${safe(r.date_of_birth)}</span></div>
      <div><p>Claiming Schedule</p><span>${safe(r.claiming_date)} ${safe(r.time_slot)}</span></div>
      ${remarksHtml}
    </div>

    <div class="button-row">
      <button class="btn" onclick="viewId('${r.id}')">View ID</button>
      <button class="btn btn-orange" onclick="setStatus('${r.id}', 'Confirmed')">Confirm</button>
      <button class="btn" onclick="setStatus('${r.id}', 'Ready for Claiming')">Ready for Claiming</button>
      <button class="btn" onclick="setStatus('${r.id}', 'Completed')">Completed</button>
      <button class="btn btn-red" onclick="setStatus('${r.id}', 'Rejected')">Reject</button>
      <button class="btn" onclick="closeDetails()">Close</button>
    </div>
  `;

  box.scrollIntoView({ behavior: "smooth" });
}

function closeDetails() {
  selectedId = null;
  document.getElementById("detailBox").style.display = "none";
}

// ---------- open the uploaded ID ----------
async function viewId(id) {
  let r = null;
  for (let i = 0; i < allRequests.length; i++) {
    if (String(allRequests[i].id) === String(id)) {
      r = allRequests[i];
    }
  }

  if (!r || !r.valid_id_path) {
    alert("This request has no uploaded ID.");
    return;
  }

  // the link only works for 60 seconds
  const { data, error } = await db.storage
    .from("valid-ids")
    .createSignedUrl(r.valid_id_path, 60);

  if (error) {
    alert("Could not open the ID: " + error.message);
    return;
  }

  window.open(data.signedUrl, "_blank");
}

// ---------- change the status and send email notification ----------
async function setStatus(id, newStatus) {
  let req = null;
  for (let i = 0; i < allRequests.length; i++) {
    if (String(allRequests[i].id) === String(id)) {
      req = allRequests[i];
    }
  }

  if (!req) {
    alert("Request not found.");
    return;
  }

  const updates = {
    status: newStatus,
    updated_at: new Date()
  };

  let rejectReason = "";
  if (newStatus === "Rejected") {
    rejectReason = prompt("Reason for rejecting this request:");
    if (!rejectReason) {
      return; // admin pressed cancel or left it empty
    }
    updates.admin_remarks = rejectReason;
  }

  const { error } = await db
    .from("document_requests")
    .update(updates)
    .eq("id", id);

  if (error) {
    alert("Could not update: " + error.message);
    return;
  }

  const subject = "eSerbisyo BIGAY: Your " + req.document_type + " is now " + newStatus;
  let statusMessage = "<p>Your request for <strong>" + safe(req.document_type) + "</strong> has been updated to: <strong>" + safe(newStatus) + "</strong>.</p>";

  if (newStatus === "Confirmed") {
    statusMessage += "<p>Your request has been reviewed and confirmed by the barangay admin. We will notify you once it is ready for claiming.</p>";
  } else if (newStatus === "Ready for Claiming") {
    statusMessage += "<p>Good news! Your document is ready for pickup at the Barangay Hall.</p>" +
      "<p><strong>Scheduled Claiming:</strong> " + safe(req.claiming_date) + " (" + safe(req.time_slot) + ")</p>";
  } else if (newStatus === "Completed") {
    statusMessage += "<p>Thank you! Your document request has been marked as completed.</p>";
  } else if (newStatus === "Rejected") {
    statusMessage += "<p>Unfortunately, your request was rejected.</p>" +
      "<p><strong>Reason:</strong> " + safe(rejectReason) + "</p>";
  }

  const htmlBody =
    '<div style="font-family: Arial, sans-serif; color: #0A1128; line-height: 1.6;">' +
      '<h2 style="color: #034078;">eSerbisyo BIGAY - Document Request Update</h2>' +
      "<p>Mabuhay <strong>" + safe(req.full_name) + "</strong>,</p>" +
      statusMessage +
      '<hr style="border: none; border-top: 1px solid #DCEBFA; margin: 20px 0;">' +
      '<p style="font-size: 12px; color: #555;">This is an automated message from the eSerbisyo Bigay System.</p>' +
    "</div>";

  const emailResult = await sendEmailNotification(req.email, subject, htmlBody);

  if (emailResult.ok) {
    alert("Status changed to " + newStatus + " and email sent to " + req.email + "!");
  } else {
    alert("Status changed to " + newStatus + ", but the email could not be sent: " + emailResult.error);
  }

  loadRequests();
}

loadRequests();