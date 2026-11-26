document.getElementById("complain").addEventListener("click", () => {
  window.location.href = "complaint.html";
});

document.getElementById("services").addEventListener("click", () => {
  window.location.href = "services.html";
});

document.getElementById("request").addEventListener("click", () => {
  window.location.href = "docreq.html";
});

document.getElementById("dashboard").addEventListener("click", () => {
  window.location.href = "admin-login.html";
});

document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("carouselTrack");
  const slides = Array.from(track.children);
  const dotsContainer = document.getElementById("carouselDots");
  
  let currentIndex = 0;
  let autoSlideInterval = null;
  const slideIntervalTime = 5000; // 5 seconds

  // 1. Create navigation dots dynamically
  slides.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.classList.add("dot");
    if (index === 0) dot.classList.add("active");
    dot.addEventListener("click", () => goToSlide(index));
    dotsContainer.appendChild(dot);
  });

  const dots = Array.from(dotsContainer.children);

  // 2. Move to specific slide index
  function goToSlide(index) {
    currentIndex = index;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    
    // Update active dot status
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === currentIndex);
    });
  }

  // 3. Move to next slide automatically
  function nextSlide() {
    currentIndex = (currentIndex + 1) % slides.length;
    goToSlide(currentIndex);
  }

  // 4. Timer control (Start/Stop)
  function startAutoSlide() {
    if (!autoSlideInterval) {
      autoSlideInterval = setInterval(nextSlide, slideIntervalTime);
    }
  }

  function stopAutoSlide() {
    clearInterval(autoSlideInterval);
    autoSlideInterval = null;
  }

  // 5. Pause auto-slide when hovering over the carousel
  const carouselElement = document.querySelector(".announcements-carousel");
  carouselElement.addEventListener("mouseenter", stopAutoSlide);
  carouselElement.addEventListener("mouseleave", startAutoSlide);

  document.getElementById("prevAnnouncement").addEventListener("click", () => {
    goToSlide((currentIndex - 1 + slides.length) % slides.length);
    stopAutoSlide();
    startAutoSlide();
  });

  document.getElementById("nextAnnouncement").addEventListener("click", () => {
    nextSlide();
    stopAutoSlide();
    startAutoSlide();
  });

  // Start initial rotation
  startAutoSlide();
});