(() => {
  "use strict";

  const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const reduced = () => !preference || preference.matches;
  const animations = new Map();
  const pendingEntrances = new Set();
  const rails = [];
  let entranceObserver;
  let pageActive = true;

  const cancelAnimations = () => {
    for (const animation of animations.values()) animation.cancel();
    animations.clear();
  };
  const runEntrance = node => {
    pendingEntrances.delete(node);
    entranceObserver?.unobserve(node);
    if (reduced() || !pageActive || node.contains(document.activeElement)) return;
    const heroImage = node.matches(".hero-image");
    const animation = node.animate(
      heroImage
        ? [{ transform: "scale(1.05)" }, { transform: "scale(1)" }]
        : [{ transform: "translateY(24px)" }, { transform: "translateY(0)" }],
      { duration: heroImage ? 4000 : 750, easing: "cubic-bezier(.2,.65,.3,1)", iterations: 1 }
    );
    animations.set(node, animation);
    const release = () => { if (animations.get(node) === animation) animations.delete(node); };
    animation.addEventListener("finish", release, { once: true });
    animation.addEventListener("cancel", release, { once: true });
  };
  const observeEntrances = () => {
    entranceObserver?.disconnect();
    if (reduced() || !pageActive) return;
    for (const node of pendingEntrances) entranceObserver?.observe(node);
  };

  // Content starts visible. Scroll motion is a one-time enhancement, with no
  // hidden state to strand content if an API or a later script is unavailable.
  if ("IntersectionObserver" in window && typeof Element.prototype.animate === "function") {
    const candidates = [...document.querySelectorAll(
      ".section-head, .introduction > div, .service-title, .service-content, .project-card, .values article, .expertise-grid article, .process li, .contact-cta .shell, .contact-details, .home-hero h1, .hero-content > p:not(.eyebrow), .page-hero h1, .page-hero .lead, .hero-image"
    )];
    candidates.filter(node => !candidates.some(parent => parent !== node && parent.contains(node))).forEach(node => pendingEntrances.add(node));
    entranceObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) runEntrance(entry.target);
      }
    }, { threshold: 0.1 });
    observeEntrances();
  }

  document.addEventListener("focusin", event => {
    for (const [node, animation] of animations) {
      if (node.contains(event.target)) animation.cancel();
    }
  });

  for (const rail of document.querySelectorAll("[data-service-rail]")) {
    const controls = rail.querySelector("[data-rail-controls]");
    const previous = rail.querySelector("[data-rail-prev]");
    const next = rail.querySelector("[data-rail-next]");
    const toggle = rail.querySelector("[data-rail-toggle]");
    const position = rail.querySelector("[data-rail-position]");
    const announcement = rail.querySelector("[data-rail-status]");
    const track = rail.querySelector("[data-rail-track]");
    const slides = [...rail.querySelectorAll("[data-rail-slide]")];
    // Without inert support, retain the ordinary list and all its usable links.
    if (!controls || !previous || !next || !toggle || !position || !track || slides.length < 2 || !("inert" in HTMLElement.prototype)) continue;

    let index = 0;
    let userPaused = false;
    let visible = false;
    let hovering = rail.matches(":hover");
    let togglePointerIntent;
    let timer;
    let visibilityObserver;
    const canObserve = "IntersectionObserver" in window;
    const stop = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
    };
    const canPlay = () => pageActive && canObserve && visible && !document.hidden && !reduced()
      && !userPaused && !hovering && !rail.contains(document.activeElement);
    const schedule = () => {
      stop();
      if (canPlay()) {
        timer = window.setTimeout(() => {
          timer = undefined;
          if (canPlay()) show(index + 1);
          schedule();
        }, 4500);
      }
    };
    const updateToggle = () => {
      const label = userPaused ? "Play" : "Pause";
      toggle.setAttribute("aria-label", `${label} service slideshow`);
      const text = toggle.querySelector("[data-rail-toggle-label]");
      const icon = toggle.querySelector("[data-rail-toggle-icon]");
      if (text) text.textContent = label;
      if (icon) icon.textContent = userPaused ? "▶" : "Ⅱ";
      if (!text && !icon) toggle.textContent = `${label} service slideshow`;
      toggle.hidden = reduced() || !canObserve;
      if (toggle.hidden && document.activeElement === toggle) previous.focus();
      track.style.transitionDuration = reduced() ? "0s" : "";
    };
    const show = (requestedIndex, manualControl) => {
      const targetIndex = (requestedIndex + slides.length) % slides.length;
      // Programmatic activations must not make a focused slide inert.
      if (slides[index].contains(document.activeElement)) {
        if (manualControl) manualControl.focus();
        else return;
      }
      index = targetIndex;
      slides.forEach((slide, slideIndex) => {
        const inactive = slideIndex !== index;
        slide.inert = inactive;
        if (inactive) slide.setAttribute("aria-hidden", "true");
        else slide.removeAttribute("aria-hidden");
      });
      track.style.transform = `translateX(-${index * 100}%)`;
      position.textContent = `${index + 1} of ${slides.length}`;
    };
    const move = (amount, control) => {
      userPaused = true;
      show(index + amount, control);
      if (announcement) {
        const title = slides[index].querySelector("h3")?.textContent.trim() || "Service";
        announcement.textContent = `Service ${index + 1} of ${slides.length}: ${title}`;
      }
      updateToggle();
      schedule();
    };

    slides.forEach((slide, slideIndex) => {
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "slide");
      slide.setAttribute("aria-label", `${slideIndex + 1} of ${slides.length}`);
    });
    rail.setAttribute("aria-roledescription", "carousel");
    rail.setAttribute("role", "region");
    if (!rail.hasAttribute("aria-label") && !rail.hasAttribute("aria-labelledby")) rail.setAttribute("aria-label", "Service highlights");
    previous.addEventListener("click", () => move(-1, previous));
    next.addEventListener("click", () => move(1, next));
    toggle.addEventListener("pointerdown", event => {
      // Pointer focus arrives before click. Preserve the action that the
      // visitor selected even when focus itself pauses the slideshow.
      if (event.isPrimary && event.button === 0) togglePointerIntent = !userPaused;
    });
    toggle.addEventListener("pointercancel", () => { togglePointerIntent = undefined; });
    toggle.addEventListener("click", event => {
      if (reduced() || !canObserve) return;
      userPaused = event.detail > 0 && togglePointerIntent !== undefined ? togglePointerIntent : !userPaused;
      togglePointerIntent = undefined;
      updateToggle();
      schedule();
    });
    rail.addEventListener("mouseenter", () => { hovering = true; schedule(); });
    rail.addEventListener("mouseleave", () => { hovering = false; schedule(); });
    rail.addEventListener("focusin", () => {
      userPaused = true;
      updateToggle();
      schedule();
    });
    rail.addEventListener("focusout", () => {
      // Wait until the browser establishes the next focused element.
      queueMicrotask(schedule);
    });
    if (canObserve) {
      visibilityObserver = new IntersectionObserver(entries => {
        visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.15);
        schedule();
      }, { threshold: [0, 0.15] });
    }
    const resume = () => {
      hovering = rail.matches(":hover");
      visibilityObserver?.observe(rail);
      updateToggle();
      schedule();
    };
    rails.push({
      sync: () => { updateToggle(); schedule(); },
      suspend: () => { stop(); visible = false; visibilityObserver?.disconnect(); },
      resume,
    });
    show(0);
    rail.setAttribute("data-enhanced", "");
    controls.hidden = false;
    resume();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimations();
    rails.forEach(rail => rail.sync());
  });
  const preferenceChanged = () => {
    cancelAnimations();
    observeEntrances();
    rails.forEach(rail => rail.sync());
  };
  if (preference?.addEventListener) preference.addEventListener("change", preferenceChanged);
  else preference?.addListener?.(preferenceChanged);
  window.addEventListener("pagehide", () => {
    pageActive = false;
    cancelAnimations();
    entranceObserver?.disconnect();
    rails.forEach(rail => rail.suspend());
  });
  window.addEventListener("pageshow", () => {
    pageActive = true;
    observeEntrances();
    rails.forEach(rail => rail.resume());
  });
})();
