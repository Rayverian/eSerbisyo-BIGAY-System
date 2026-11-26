document.getElementById("complain").addEventListener("click", () => {
  window.location.href = "complaint.html";
});

document.getElementById("request").addEventListener("click", () => {
  window.location.href = "docreq.html";
});

document.getElementById("home").addEventListener("click", () => {
  window.location.href = "home.html";
});

document.getElementById("dashboard").addEventListener("click", () => {
  window.location.href = "admin-login.html";
});

//this is for the search function
function searchServices() {

    // Get the search input
    let input = document.getElementById("serviceSearch");

    let filter = input.value.toLowerCase().trim();

    let services = document.querySelectorAll(".serviceplaceholder");

    let headers = document.querySelectorAll(
        "#A, #B, #C, #D, #E, #F, #G, #H, #I"
    );

    let visibleCount = 0;

    // Search every service card
    services.forEach(function(service) {

        let serviceName = service.querySelector("h4")
            .textContent.toLowerCase();

        if (serviceName.includes(filter)) {

            service.style.display = "block";
            visibleCount++;

        } else {

            service.style.display = "none";

        }

    });

    // Hide section headers if no cards are visible
    headers.forEach(function(header) {

        let nextSection = header.nextElementSibling;

        if (nextSection) {

            let visibleCards = nextSection.querySelectorAll(
                ".serviceplaceholder"
            );

            let hasVisibleCards = Array.from(visibleCards).some(
                card => card.style.display !== "none"
            );

            header.style.display = hasVisibleCards ? "block" : "none";

        }

    });

    // Display message if no results
    let noResults = document.getElementById("noResults");

    if (visibleCount === 0) {
        noResults.style.display = "block";
    } else {
        noResults.style.display = "none";
    }

}