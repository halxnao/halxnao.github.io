// HALXNAO — main.js
// Two small jobs only. The site still works if this file never loads.

// 1. Mark the page as "JS available" so the CSS can collapse the mobile menu.
//    Without JS, the menu simply stays open and fully usable.
document.documentElement.classList.add("js");

// 2. Mobile menu toggle (keyboard + touch friendly: it's a real <button>)
const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector("#site-nav");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  // Escape closes the menu and returns focus to the button
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }
  });
}

// 3. Keep the footer year current (a 2026 fallback is written in the HTML)
const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

// 4. Scroll reveal: items fade up as they enter the screen.
//    Skipped for visitors who prefer reduced motion, so nothing is ever hidden for them.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion && "IntersectionObserver" in window) {
  const items = document.querySelectorAll(
    ".section-title, .app-card, .feature-list li, .shot-group, .shot-grid > li, .panel, .contact-box, .link-list, .edition-note"
  );
  document.documentElement.classList.add("reveal-ready");
  const seen = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.classList.add("is-visible");
        seen.unobserve(el);
        // when the fade finishes, drop the helper classes so hover effects work normally
        el.addEventListener("transitionend", (e) => {
          if (e.propertyName === "opacity") el.classList.remove("reveal", "is-visible");
        });
      }
    });
  }, { threshold: 0.12 });
  items.forEach((el) => {
    el.classList.add("reveal");
    // stagger siblings a little: first item 0, next 1, ... capped at 5
    el.style.setProperty("--i", Math.min([...el.parentElement.children].indexOf(el), 5));
    seen.observe(el);
  });
}

// 5. Full-size screenshot viewer.
//    Each screenshot gets wrapped in a button. Clicking opens a native <dialog>
//    (which already traps focus and closes on Escape). Arrow keys / buttons / swipe move between images.
const shots = [...document.querySelectorAll(".shot img")];
if (shots.length && typeof HTMLDialogElement === "function") {
  const dialog = document.createElement("dialog");
  dialog.className = "lightbox";
  dialog.setAttribute("aria-label", "Screenshot viewer");
  dialog.innerHTML =
    '<button class="lb-btn lb-close" type="button" aria-label="Close">&times;</button>' +
    '<button class="lb-btn lb-prev" type="button" aria-label="Previous screenshot">&#8249;</button>' +
    '<button class="lb-btn lb-next" type="button" aria-label="Next screenshot">&#8250;</button>' +
    '<figure class="lb-figure"><img class="lb-img" alt=""><figcaption class="lb-caption"></figcaption></figure>';
  document.body.appendChild(dialog);

  const img = dialog.querySelector(".lb-img");
  const caption = dialog.querySelector(".lb-caption");
  const prev = dialog.querySelector(".lb-prev");
  const next = dialog.querySelector(".lb-next");
  let index = 0;

  function show(i) {
    index = (i + shots.length) % shots.length;
    const src = shots[index];
    img.classList.remove("is-swapping");
    void img.offsetWidth;                       // restart the swap animation
    img.src = src.currentSrc || src.src;
    img.alt = src.alt;
    img.classList.add("is-swapping");
    const text = src.closest("figure").querySelector("figcaption");
    caption.innerHTML = "<b></b> &middot; " + (index + 1) + " / " + shots.length;
    caption.firstChild.textContent = text ? text.textContent : "";
    // optional credit: <figure class="shot" data-credit="Video by Name" data-credit-url="https://...">
    var fig = src.closest("figure");
    if (fig.dataset.credit) {
      caption.appendChild(document.createTextNode(" \u00b7 "));
      if (fig.dataset.creditUrl) {
        var link = document.createElement("a");
        link.href = fig.dataset.creditUrl;
        link.rel = "noopener noreferrer";
        link.target = "_blank";
        link.textContent = fig.dataset.credit;
        caption.appendChild(link);
      } else {
        caption.appendChild(document.createTextNode(fig.dataset.credit));
      }
    }
  }

  shots.forEach((el, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "shot-open";
    const text = el.closest("figure").querySelector("figcaption");
    button.setAttribute("aria-label", "View larger: " + (text ? text.textContent : el.alt));
    el.parentNode.insertBefore(button, el);
    button.appendChild(el);
    button.addEventListener("click", () => { show(i); dialog.showModal(); });
  });

  prev.hidden = next.hidden = shots.length < 2;
  prev.addEventListener("click", () => show(index - 1));
  next.addEventListener("click", () => show(index + 1));
  dialog.querySelector(".lb-close").addEventListener("click", () => dialog.close());

  // clicking the dark area (not the image or buttons) closes it
  dialog.addEventListener("click", (e) => { if (e.target === dialog || e.target.classList.contains("lb-figure")) dialog.close(); });

  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(index - 1);
    if (e.key === "ArrowRight") show(index + 1);
  });

  // swipe left/right on touch screens
  let startX = null;
  img.addEventListener("pointerdown", (e) => { startX = e.clientX; });
  img.addEventListener("pointerup", (e) => {
    if (startX !== null && Math.abs(e.clientX - startX) > 50) show(index + (e.clientX < startX ? 1 : -1));
    startX = null;
  });
}

// 6. Download buttons that are not ready yet.
//    A link with the attribute data-soon, or one whose address still contains YOUR_ (a placeholder),
//    becomes a greyed-out "Coming soon" button instead of a broken link.
document.querySelectorAll("a.dl").forEach((link) => {
  const href = link.getAttribute("href") || "";
  if (!link.hasAttribute("data-soon") && href.indexOf("YOUR_") === -1) return;
  link.removeAttribute("href");
  link.removeAttribute("rel");
  link.setAttribute("aria-disabled", "true");
  link.classList.add("btn-disabled");
  link.textContent += " \u00b7 coming soon";
});

// 7. Social links that are still placeholders (YOUR_...) stay hidden until you paste the real address.
document.querySelectorAll(".footer-social a").forEach((link) => {
  if ((link.getAttribute("href") || "").indexOf("YOUR_") !== -1) link.parentElement.hidden = true;
});
