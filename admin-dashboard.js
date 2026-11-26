let allRequests = [];
let allComplaints = [];
let days = 7; // how many days back we are counting

// ---------- get everything from supabase ----------
async function loadDashboard() {
  const reqResult = await db.from("document_requests").select("*");
  const compResult = await db.from("complaints").select("*");

  if (reqResult.error) {
    alert("Could not load requests: " + reqResult.error.message);
    return;
  }
   allRequests = reqResult.data;

  if (compResult.error) {
    console.log("Complaints not loaded: " + compResult.error.message);
    allComplaints = [];
  } else {
    allComplaints = compResult.data;
  }

  showDashboard();
}

// ---------- put the numbers on the page ----------
function showDashboard() {
  // only count the ones inside the selected number of days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const requests = [];
  for (let i = 0; i < allRequests.length; i++) {
    if (new Date(allRequests[i].created_at) >= cutoff) {
      requests.push(allRequests[i]);
    }
  }

  const complaints = [];
  for (let i = 0; i < allComplaints.length; i++) {
    if (new Date(allComplaints[i].created_at) >= cutoff) {
      complaints.push(allComplaints[i]);
    }
  }

  // count the statuses
  let pending = 0;
  let completed = 0;
  for (let i = 0; i < requests.length; i++) {
    if (requests[i].status === "Pending") {
      pending++;
    }
    if (requests[i].status === "Completed") {
      completed++;
    }
  }

  let openComplaints = 0;
  let doneComplaints = 0;
  for (let i = 0; i < complaints.length; i++) {
    if (complaints[i].status === "Pending") {
      openComplaints++;
    } else {
      doneComplaints++;
    }
  }

  document.getElementById("totalRequests").textContent = requests.length;
  document.getElementById("pendingRequests").textContent = pending;
  document.getElementById("openComplaints").textContent = openComplaints;
  document.getElementById("completedRequests").textContent = completed;

  // requests per document type (same names as the dropdown in the form)
  const docTypes = [
    "Barangay Clearance",
    "Barangay Certificate of Indigency",
    "Barangay Certificate of Residency",
    "Endorsement Letter",
    "First Time Job Seeker"
  ];

  const docCounts = [];
  for (let i = 0; i < docTypes.length; i++) {
    let n = 0;
    for (let j = 0; j < requests.length; j++) {
      if (requests[j].document_type === docTypes[i]) {
        n++;
      }
    }
    docCounts.push(n);
  }

  document.getElementById("docBars").innerHTML = makeBars(docTypes, docCounts);
  document.getElementById("complaintBars").innerHTML = makeBars(
    ["Pending", "Done"],
    [openComplaints, doneComplaints]
  );

  showActivity(requests, complaints);
}

// makes the bars (labels and numbers are arrays)
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
    return new Date(b.date) - new Date(a.date);
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
