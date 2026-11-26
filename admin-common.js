// This file is used by ALL admin pages (dashboard, requests, complaints)

// check if the admin is logged in. If not, go back to the login page.
// the page is hidden first (display:none) so it doesn't flash on the screen
async function checkLogin() {
  const { data } = await db.auth.getSession();

  if (!data.session) {
    window.location.href = "admin-login.html";
  } else {
    document.body.style.display = "block";
  }
}

checkLogin();

// logout button
document.getElementById("logoutBtn").addEventListener("click", async function () {
  await db.auth.signOut();
  window.location.href = "admin-login.html";
});

// makes the text safe before putting it in the page
// (so if a resident types <script> or something it won't break our page)
function safe(text) {
  if (text === null || text === undefined) {
    return "";
  }
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// turns the date from the database into something readable
function formatDate(dateString) {
  if (!dateString) {
    return "";
  }
  const d = new Date(dateString);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// "Ready for Claiming" -> "Ready-for-Claiming" (used for the css class of the badge)
function statusClass(status) {
  return "status-" + String(status).replace(/ /g, "-");
}

// sends an email through our Supabase Edge Function (send-email)
async function sendEmailNotification(to, subject, html) {
  if (!to) {
    console.warn("No recipient email address provided. Skipping email.");
    return { ok: false, error: "No email address" };
  }

  const { data, error } = await db.functions.invoke("send-email", {
    body: {
      to: to,
      subject: subject,
      html: html
    }
  });

  if (error) {
    console.error("Email failed to send:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, data: data };
}