// Shared, lightweight behaviors used across pages.

// Animates an element's number from 0 up to `target` once it scrolls into view.
function animateCountUp(el, target, duration = 1200) {
  const startTime = performance.now();
  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(target * eased);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

function setupCountUps() {
  const els = document.querySelectorAll("[data-countup]");
  if (!els.length) return;
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => { el.textContent = el.dataset.countup; });
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCountUp(entry.target, Number(entry.target.dataset.countup));
      io.unobserve(entry.target);
    });
  }, { threshold: 0.4 });
  els.forEach((el) => io.observe(el));
}

document.addEventListener("DOMContentLoaded", () => {
  // 0. Live plot-status counts — keeps every "live inventory" number on the
  // site (announcement bar, hero ticker, project cards) truthful and in sync,
  // instead of hardcoded copy that drifts from the real data and from itself.
  // Numbers count up from 0 the first time they scroll into view.
  if (typeof GV_DATA !== "undefined") {
    const counts = GV_DATA.statusCounts();
    document.querySelectorAll("[data-live-count]").forEach((el) => {
      const key = el.dataset.liveCount;
      if (counts[key] !== undefined) {
        el.dataset.countup = counts[key];
        el.textContent = "0";
      }
    });
  }
  setupCountUps();

  // Scroll-reveal animations (AOS) and the project/testimonial carousels (Swiper).
  if (typeof AOS !== "undefined") {
    AOS.init({ duration: 650, easing: "ease-out-cubic", once: true, offset: 60 });
  }
  if (typeof Swiper !== "undefined") {
    if (document.querySelector(".project-swiper")) {
      new Swiper(".project-swiper", {
        slidesPerView: 1.1,
        spaceBetween: 22,
        breakpoints: {
          640: { slidesPerView: 1.5 },
          960: { slidesPerView: 2.2 },
        },
        pagination: { el: ".project-swiper .swiper-pagination", clickable: true },
        navigation: { nextEl: ".project-swiper .swiper-button-next", prevEl: ".project-swiper .swiper-button-prev" },
      });
    }
    if (document.querySelector(".testimonial-swiper")) {
      new Swiper(".testimonial-swiper", {
        slidesPerView: 1,
        spaceBetween: 20,
        loop: true,
        autoplay: { delay: 4500, disableOnInteraction: false },
        pagination: { el: ".testimonial-swiper .swiper-pagination", clickable: true },
        breakpoints: {
          720: { slidesPerView: 2 },
          1000: { slidesPerView: 3 },
        },
      });
    }
  }

  // 1. Callback form handler
  const form = document.getElementById("callback-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      if (typeof GV_DATA !== "undefined") {
        GV_DATA.saveLead({
          name: data.get("name"),
          phone: data.get("phone"),
          project: GV_DATA.project.name,
          source: "website_callback_form",
          status: "new",
        });
      }
      const confirmEl = document.getElementById("callback-confirm");
      if (confirmEl) confirmEl.style.display = "block";
      form.reset();
    });
  }

  // 2. 360° Drone Tour Modal Handlers across all pages
  const droneModal = document.getElementById("drone-modal");
  const droneClose = document.getElementById("drone-close");
  const droneViewport = document.getElementById("drone-viewport");
  const dronePanoImg = document.getElementById("drone-pano-img");

  function openDroneModal() {
    if (droneModal) droneModal.classList.add("open");
  }

  document.querySelectorAll(".trigger-drone-tour").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openDroneModal();
    });
  });

  if (droneClose && droneModal) {
    droneClose.addEventListener("click", () => droneModal.classList.remove("open"));
  }

  if (droneViewport && dronePanoImg) {
    let isDragging = false;
    let startX = 0;
    let currentPanX = 0;

    droneViewport.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX - currentPanX;
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      currentPanX = e.clientX - startX;
      dronePanoImg.style.transform = `scale(1.25) translateX(${currentPanX * 0.4}px)`;
    });

    window.addEventListener("mouseup", () => { isDragging = false; });

    droneViewport.addEventListener("touchstart", (e) => {
      isDragging = true;
      startX = e.touches[0].clientX - currentPanX;
    });

    window.addEventListener("touchmove", (e) => {
      if (!isDragging) return;
      currentPanX = e.touches[0].clientX - startX;
      dronePanoImg.style.transform = `scale(1.25) translateX(${currentPanX * 0.4}px)`;
    });

    window.addEventListener("touchend", () => { isDragging = false; });
  }

  // 3. Homepage Quick Plot Finder Widget Logic
  const facingSel = document.getElementById("hp-finder-facing");
  const sizeSel = document.getElementById("hp-finder-size");
  const statusSel = document.getElementById("hp-finder-status");
  const priceSel = document.getElementById("hp-finder-price");
  const matchBtn = document.getElementById("hp-finder-btn");

  function updateMatchCount() {
    if (typeof GV_DATA === "undefined") return;
    const plots = GV_DATA.getPlots();
    const facing = facingSel ? facingSel.value : "all";
    const size = sizeSel ? sizeSel.value : "all";
    const status = statusSel ? statusSel.value : "all";
    const maxPrice = priceSel ? Number(priceSel.value) : 8000000;

    const matching = plots.filter(p => {
      if (status !== "all" && p.status !== status) return false;
      if (facing !== "all" && p.facing !== facing) return false;
      if (size !== "all" && String(p.area) !== size) return false;
      if (p.price > maxPrice) return false;
      return true;
    }).length;

    if (matchBtn) {
      matchBtn.textContent = `Explore ${matching} Matching Plots in 3D ↗`;
    }
  }

  if (facingSel) facingSel.addEventListener("change", updateMatchCount);
  if (sizeSel) sizeSel.addEventListener("change", updateMatchCount);
  if (statusSel) statusSel.addEventListener("change", updateMatchCount);
  if (priceSel) priceSel.addEventListener("change", updateMatchCount);

  if (matchBtn) {
    matchBtn.addEventListener("click", () => {
      const facing = facingSel ? facingSel.value : "all";
      const size = sizeSel ? sizeSel.value : "all";
      const status = statusSel ? statusSel.value : "all";
      window.location.href = `project.html?facing=${facing}&size=${size}&status=${status}`;
    });
    updateMatchCount();
  }

  // 4. Homepage Interactive Investment & EMI Calculator Logic
  const calcSize = document.getElementById("hp-calc-size");
  const calcRate = document.getElementById("hp-calc-rate");
  const valSizeLabel = document.getElementById("hp-calc-size-val");
  const valRateLabel = document.getElementById("hp-calc-rate-val");
  const totalPriceEl = document.getElementById("hp-total-price");
  const loanAmtEl = document.getElementById("hp-loan-amt");
  const estEmiEl = document.getElementById("hp-est-emi");

  function updateHomepageCalc() {
    if (!calcSize || !calcRate) return;
    const sqYards = Number(calcSize.value);
    const ratePerYd = Number(calcRate.value);

    if (valSizeLabel) valSizeLabel.textContent = `${sqYards} Sq. Yds`;
    if (valRateLabel) valRateLabel.textContent = typeof GV_DATA !== "undefined" ? GV_DATA.formatINR(ratePerYd) : `₹${ratePerYd.toLocaleString('en-IN')}`;

    const totalPrice = sqYards * ratePerYd;
    const loanAmt = totalPrice * 0.8; // 80% loan approval
    
    // EMI formula: P * r * (1+r)^n / ((1+r)^n - 1) for 15 years @ 8.5% p.a.
    const monthlyRate = 0.085 / 12;
    const totalMonths = 180;
    const emi = (loanAmt * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);

    if (totalPriceEl && typeof GV_DATA !== "undefined") {
      totalPriceEl.textContent = GV_DATA.formatINR(totalPrice);
    }
    if (loanAmtEl && typeof GV_DATA !== "undefined") {
      loanAmtEl.textContent = GV_DATA.formatINR(loanAmt);
    }
    if (estEmiEl && typeof GV_DATA !== "undefined") {
      estEmiEl.textContent = `${GV_DATA.formatINR(Math.round(emi))}/mo`;
    }
  }

  if (calcSize) calcSize.addEventListener("input", updateHomepageCalc);
  if (calcRate) calcRate.addEventListener("input", updateHomepageCalc);
  updateHomepageCalc();

  // 5. Hero Visual Mode Switcher (3D Model vs Running Drone Video)
  const tab3d = document.getElementById("hero-tab-3d");
  const tabVideo = document.getElementById("hero-tab-video");
  const heroVisual = document.querySelector(".hero-visual");

  if (tab3d && tabVideo && heroVisual) {
    tab3d.addEventListener("click", () => {
      tab3d.classList.add("active");
      tabVideo.classList.remove("active");
      heroVisual.classList.remove("video-active");
    });
    tabVideo.addEventListener("click", () => {
      tabVideo.classList.add("active");
      tab3d.classList.remove("active");
      heroVisual.classList.add("video-active");
      const vid = heroVisual.querySelector("video");
      if (vid && vid.paused) vid.play().catch(() => {});
      playPauseBtn?.setAttribute("aria-label", "Pause promotional video");
      if (playPauseBtn) playPauseBtn.textContent = "⏸";
    });
  }

  // 6. Explicit play/pause control on the hero promotional video.
  const playPauseBtn = document.getElementById("hero-video-playpause");
  const heroVideo = document.querySelector(".hero-visual-video");
  if (playPauseBtn && heroVideo) {
    playPauseBtn.addEventListener("click", () => {
      if (heroVideo.paused) {
        heroVideo.play().catch(() => {});
        playPauseBtn.textContent = "⏸";
        playPauseBtn.setAttribute("aria-label", "Pause promotional video");
      } else {
        heroVideo.pause();
        playPauseBtn.textContent = "▶";
        playPauseBtn.setAttribute("aria-label", "Play promotional video");
      }
    });
  }

  // Keep "live inventory" numbers live if the admin panel changes data in another tab.
  window.addEventListener("storage", (e) => {
    if (e.key === "gv_infra_plots_v1" && typeof GV_DATA !== "undefined") {
      GV_DATA.reloadPlots();
      const counts = GV_DATA.statusCounts();
      document.querySelectorAll("[data-live-count]").forEach((el) => {
        const key = el.dataset.liveCount;
        if (counts[key] !== undefined) el.textContent = counts[key];
      });
      updateMatchCount();
    }
  });
});


