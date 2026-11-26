document.getElementById("complain").addEventListener("click", () => {
  window.location.href = "complaint.html";
});

document.getElementById("services").addEventListener("click", () => {
  window.location.href = "services.html";
});

document.getElementById("home").addEventListener("click", () => {
  window.location.href = "home.html";
});

document.getElementById("request").addEventListener("click", () => {
  window.location.href = "docreq.html";
});



// If already logged in, skip the login page
(async () => {
  const { data } = await db.auth.getSession();
  if (data.session) window.location.href = "admin-dashboard.html";
})();

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = document.getElementById("loginBtn");
  const errorMsg = document.getElementById("errorMsg");
  btn.disabled = true;
  errorMsg.textContent = "";

  const { error } = await db.auth.signInWithPassword({
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
  });

  btn.disabled = false;

  if (error) {
    errorMsg.textContent = error.message; // Shows the exact Supabase error if login fails
  } else {
    window.location.href = "admin-dashboard.html";
  }
});