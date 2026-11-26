let allRequests = [];
let allComplaints = [];
let days = 7; // how many days back we are counting

// ---------- helper functions ----------
function safe(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(dateString) {
  if (!dateString) return "No date";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ---------- get everything from supabase ----------
async function loadDashboard() {
  const reqResult = await db.from("document_requests").select("*");
  const compResult = await db.from("complaints").select("*");

  if (reqResult.error) {
    alert("Could not load requests: " + reqResult.error.message);
    return;
  }
  allRequests = reqResult.data || [];

  if (compResult.error) {
    console.log("Complaints not loaded: " + compResult.error.message);
    allComplaints = [];
  } else {
    allComplaints = compResult.data || [];
  }

  showDashboard();
}

// ---------- put the numbers on the page ----------
function showDashboard() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // filter requests within selected days (if days is 0 or NaN, show all time)
  const requests = [];
  for (let i = 0; i < allRequests.length; i++) {
    const created = allRequests[i].created_at ? new Date(allRequests[i].created_at) : new Date();
    if (!days || days <= 0 || created >= cutoff) {
      requests.push(allRequests[i]);
    }
  }

  // filter complaints within selected days
  const complaints = [];
  for (let i = 0; i < allComplaints.length; i++) {
    const created = allComplaints[i].created_at ? new Date(allComplaints[i].created_at) : new Date();
    if (!days || days <= 0 || created >= cutoff) {
      complaints.push(allComplaints[i]);
    }
  }

  // count request statuses (case-insensitive, defaults null/empty to "pending")
  let pending = 0;
  let completed = 0;
  for (let i = 0; i < requests.length; i++) {
    const status = (requests[i].status || "pending").trim().toLowerCase();
    if (status === "pending") {
      pending++;
    } else if (status === "completed") {
      completed++;
    }
  }

  // count complaint statuses (case-insensitive)
  let openComplaints = 0;
  let doneComplaints = 0;
  for (let i = 0; i < complaints.length; i++) {
    const status = (complaints[i].status || "pending").trim().toLowerCase();
    if (status === "pending") {
      openComplaints++;
    } else {
      doneComplaints++;
    }
  }

  // update summary cards
  document.getElementById("totalRequests").textContent = requests.length;
  document.getElementById("pendingRequests").textContent = pending;
  document.getElementById("openComplaints").textContent = openComplaints;
  document.getElementById("completedRequests").textContent = completed;

  // requests per document type (matches both full and short names)
  const docTypes = [
    { label: "Barangay Clearance", match: ["barangay clearance"] },
    { label: "Certificate of Indigency", match: ["barangay certificate of indigency", "certificate of indigency"] },
    { label: "Certificate of Residency", match: ["barangay certificate of residency", "certificate of residency"] },
    { label: "Endorsement Letter", match: ["endorsement letter"] },
    { label: "Job Seeker Application", match: ["first time job seeker", "job seeker application"] }
  ];

  const docLabels = [];
  const docCounts = [];

  for (let i = 0; i < docTypes.length; i++) {
    docLabels.push(docTypes[i].label);
    let n = 0;
    for (let j = 0; j < requests.length; j++) {
      const reqDoc = (requests[j].document_type || "").trim().toLowerCase();
      if (docTypes[i].match.includes(reqDoc)) {
        n++;
      }
    }
    docCounts.push(n);
  }

  document.getElementById("docBars").innerHTML = makeBars(docLabels, docCounts);
  document.getElementById("complaintBars").innerHTML = makeBars(
    ["Pending", "Done"],
    [openComplaints, doneComplaints]
  );

  showActivity(requests, complaints);
}

// ---------- makes the horizontal bar charts ----------
function makeBars(labels, numbers) {
  let biggest = 0;
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] > biggest) {
      biggest = numbers[i];
    }
  }

  let html = "";
  for (let i = 0; i < labels.length; i++) {
    let width = 0;
    if (biggest > 0) {
      width = (numbers[i] / biggest) * 100;
    }

    html += `
      <div class="bar-row">
        <span>${safe(labels[i])}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
        <span>${numbers[i]}</span>
      </div>`;
  }
  return html;
}

// ---------- recent activity (latest requests and complaints mixed) ----------
function showActivity(requests, complaints) {
  const items = [];

  for (let i = 0; i < requests.length; i++) {
    items.push({
      text: "New request from " + (requests[i].full_name || "Resident"),
      detail: requests[i].document_type || "",
      date: requests[i].created_at
    });
  }

  for (let i = 0; i < complaints.length; i++) {
    const msg = complaints[i].message || complaints[i].complaint || complaints[i].description || "";
    items.push({
      text: "New complaint from " + (complaints[i].full_name || "Resident"),
      detail: String(msg).substring(0, 50),
      date: complaints[i].created_at
    });
  }

  // newest first
  items.sort(function (a, b) {
    return new Date(b.date || 0) - new Date(a.date || 0);
  });

  const list = document.getElementById("activityList");

  if (items.length === 0) {
    list.innerHTML = `<p class="empty">No activity in this period.</p>`;
    return;
  }

  let html = "";
  for (let i = 0; i < items.length && i < 6; i++) {
    html += `
      <div class="activity-item">
        ${safe(items[i].text)}
        <small>${safe(items[i].detail)} | ${formatDate(items[i].date)}</small>
      </div>`;
  }
  list.innerHTML = html;
}

// ---------- the 7 days / 30 days / all time buttons ----------
const rangeButtons = document.querySelectorAll("#rangeButtons button");

rangeButtons.forEach(function (btn) {
  btn.addEventListener("click", function () {
    days = Number(btn.dataset.range);

    rangeButtons.forEach(function (b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");

    showDashboard();
  });
});

loadDashboard();
