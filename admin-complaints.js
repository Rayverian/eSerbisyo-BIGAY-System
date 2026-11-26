const listEl = document.getElementById("complaintList");
const detailEl = document.getElementById("complaintDetail");
const filterEl = document.getElementById("filters");

let complaints = [];
let currentFilter = "All";
let selectedId = null;

// "14:30:00" -> "2:30 PM"
function fmtTime(t) {
  if (!t) return "-";
  const parts = t.split(":");
  const hour = Number(parts[0]);
  return (hour % 12 || 12) + ":" + parts[1] + " " + (hour >= 12 ? "PM" : "AM");
}

function fmtDateTime(ts) {
  return new Date(ts).toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit"
  });
}

function badge(status) {
  const bg = status === "Done" ? "#0A1128" : "#DCEBFA";
  const color = status === "Done" ? "#FEFCFB" : "#034078";
  const border = status === "Done" ? "#0A1128" : "#87BFFF";
  return '<span class="' + statusClass(status) + '" style="font-size:11px;padding:2px 10px;border-radius:20px;background:' + bg + ';border:1px solid ' +
    border + ";color:" + color + ';font-weight:bold">' + safe(status) + "</span>";
}

// ---------- load from supabase ----------
async function loadComplaints() {
  listEl.innerHTML = '<p class="empty">Loading...</p>';

  const { data, error } = await db
    .from("complaints")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    listEl.innerHTML = '<p class="empty">Could not load complaints: ' + safe(error.message) + "</p>";
    return;
  }

  complaints = data;
  showList();
  showDetail();
}

// ---------- left side: list ----------
function showList() {
  const items = currentFilter === "All"
    ? complaints
    : complaints.filter(function (c) { return c.status === currentFilter; });

  if (items.length === 0) {
    listEl.innerHTML = '<p class="empty">No complaints found.</p>';
    return;
  }

  let html = "";
  items.forEach(function (c) {
    html +=
      '<div class="complaint-item ' + (c.id === selectedId ? "selected" : "") + '" data-id="' + safe(c.id) + '">' +
        '<div class="top"><strong>' + safe(c.incident_category) + "</strong>" + badge(c.status) + "</div>" +
        "<p>" + safe(c.sitio) + " &bull; " + safe(c.specific_landmark_address) + "</p>" +
        "<p>" + formatDate(c.date_of_incident) + " &bull; Submitted " + fmtDateTime(c.created_at) + "</p>" +
      "</div>";
  });
  listEl.innerHTML = html;
}

// ---------- right side: details ----------
function showDetail() {
  const c = complaints.find(function (x) { return x.id === selectedId; });

  if (!c) {
    detailEl.innerHTML = '<p class="empty">Select a complaint to view it.</p>';
    return;
  }

  const file = c.photo_evidence && c.photo_evidence.startsWith("https://") ? c.photo_evidence : null;
  const isImage = file && /\.(jpe?g|png|gif|webp)$/i.test(file);

  let fileHtml = "";
  if (file && isImage) {
    fileHtml =
      '<p style="color:#034078;font-size:12px">PHOTO EVIDENCE/FILES</p>' +
      '<a href="' + safe(file) + '" target="_blank" rel="noopener">' +
      '<img src="' + safe(file) + '" alt="Evidence" style="max-width:100%;max-height:320px;border-radius:8px;margin:8px 0 15px;display:block"></a>';
  } else if (file) {
    fileHtml =
      '<p style="color:#034078;font-size:12px">PHOTO EVIDENCE/FILES</p>' +
      '<p style="margin:8px 0 15px"><a href="' + safe(file) + '" target="_blank" rel="noopener" style="color:#2667FF">Open attached file</a></p>';
  }

  detailEl.innerHTML =
    "<h2>" + safe(c.incident_category) + " " + badge(c.status) + "</h2>" +
    '<div class="detail-grid">' +
      "<div><p>SITIO</p><span>" + safe(c.sitio) + "</span></div>" +
      "<div><p>SPECIFIC LANDMARK/ADDRESS</p><span>" + safe(c.specific_landmark_address) + "</span></div>" +
      "<div><p>EMAIL</p><span>" + safe(c.email || "Not provided") + "</span></div>" +
      "<div><p>DATE OF INCIDENT</p><span>" + formatDate(c.date_of_incident) + "</span></div>" +
      "<div><p>APPROXIMATE TIME</p><span>" + fmtTime(c.approximate_time) + "</span></div>" +
      "<div><p>SUBMITTED</p><span>" + fmtDateTime(c.created_at) + "</span></div>" +
    "</div>" +
    '<p style="color:#034078;font-size:12px">INCIDENT NARRATIVE DESCRIPTION</p>' +
    '<div class="message-box">' + safe(c.incident_narrative_description).replace(/\n/g, "<br>") + "</div>" +
    fileHtml +
    '<div class="button-row">' +
      '<button data-action="toggle" style="background:#960200;border:1px solid #960200;color:#FEFCFB;padding:8px 18px;border-radius:6px;cursor:pointer;font-weight:bold">' +
        (c.status === "Done" ? "Reopen (Pending)" : "Mark as Done") +
      "</button>" +
    "</div>";
}

// ---------- clicks ----------
filterEl.addEventListener("click", function (e) {
  const btn = e.target.closest("button[data-status]");
  if (!btn) return;

  currentFilter = btn.dataset.status;
  filterEl.querySelectorAll("button").forEach(function (b) {
    b.classList.toggle("active", b === btn);
  });
  showList();
});

listEl.addEventListener("click", function (e) {
  const item = e.target.closest(".complaint-item");
  if (!item) return;

  selectedId = item.dataset.id;
  showList();
  showDetail();
});

detailEl.addEventListener("click", async function (e) {
  if (!e.target.closest('button[data-action="toggle"]') || !selectedId) return;

  const c = complaints.find(function (x) { return x.id === selectedId; });
  const newStatus = c.status === "Done" ? "Pending" : "Done";

  const { error } = await db.from("complaints").update({ status: newStatus }).eq("id", selectedId);
  if (error) {
    alert("Update failed: " + error.message);
    return;
  }

  c.status = newStatus;
  showList();
  showDetail();

  if (c.email) {
    const subject = "eSerbisyo BIGAY: Your Complaint Report is now " + newStatus;
    const statusText = newStatus === "Done"
      ? "<p>Your barangay complaint regarding <strong>" + safe(c.incident_category) + "</strong> at <strong>" + safe(c.sitio) + "</strong> has been addressed and marked as <strong>Done</strong>.</p>"
      : "<p>Your barangay complaint regarding <strong>" + safe(c.incident_category) + "</strong> at <strong>" + safe(c.sitio) + "</strong> has been reopened and set back to <strong>Pending</strong> for further action.</p>";

    const htmlBody =
      '<div style="font-family: Arial, sans-serif; color: #0A1128; line-height: 1.6;">' +
        '<h2 style="color: #034078;">eSerbisyo BIGAY - Complaint Status Update</h2>' +
        "<p>Mabuhay Resident,</p>" +
        statusText +
        '<hr style="border: none; border-top: 1px solid #DCEBFA; margin: 20px 0;">' +
        '<p style="font-size: 12px; color: #555;">This is an automated message from the eSerbisyo BIGAY System.</p>' +
      "</div>";

    const emailResult = await sendEmailNotification(c.email, subject, htmlBody);
    if (emailResult.ok) {
      alert("Status updated to " + newStatus + " and email sent to " + c.email + "!");
    } else {
      alert("Status updated to " + newStatus + ", but email failed: " + emailResult.error);
    }
  }
});

loadComplaints();