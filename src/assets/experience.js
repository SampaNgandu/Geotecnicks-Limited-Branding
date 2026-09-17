(() => {
  const explorer = document.querySelector("[data-service-explorer]");
  if (explorer) {
    const tablist = explorer.querySelector('[role="tablist"]');
    const tabs = [...explorer.querySelectorAll("[data-service-tab]")];
    const panels = tabs.map(tab => document.getElementById(tab.getAttribute("aria-controls")));
    if (tablist && tabs.length && panels.every(panel => panel && explorer.contains(panel))) {
      panels.forEach((panel, index) => {
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", tabs[index].id);
        panel.tabIndex = 0;
      });
      const select = (index, moveFocus = false) => {
        tabs.forEach((tab, tabIndex) => {
          const active = tabIndex === index;
          tab.setAttribute("aria-selected", String(active));
          tab.tabIndex = active ? 0 : -1;
          panels[tabIndex].hidden = !active;
        });
        if (moveFocus) tabs[index].focus();
      };
      tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => select(index));
        tab.addEventListener("keydown", event => {
          let next;
          if (event.key === "ArrowDown") next = (index + 1) % tabs.length;
          if (event.key === "ArrowUp") next = (index - 1 + tabs.length) % tabs.length;
          if (event.key === "Home") next = 0;
          if (event.key === "End") next = tabs.length - 1;
          if (next === undefined) return;
          event.preventDefault();
          select(next, true);
        });
      });
      select(Math.max(0, tabs.findIndex(tab => tab.getAttribute("aria-selected") === "true")));
      explorer.setAttribute("data-enhanced", "");
      tablist.hidden = false;
    }
  }

  const form = document.querySelector("#enquiry-form");
  if (!form) return;
  const tools = form.querySelector("[data-enquiry-tools]");
  const progress = form.querySelector("#brief-progress");
  const progressText = form.querySelector("[data-brief-progress-text]");
  const preview = form.querySelector("[data-enquiry-preview]");
  const copy = form.querySelector("[data-copy-enquiry]");
  const copyStatus = form.querySelector("[data-copy-status]");
  const guidance = form.querySelector("[data-service-guidance]");
  const service = form.querySelector('select[name="service"]');
  const required = ["name", "email", "service", "details"].map(name => form.elements.namedItem(name));
  if (!tools || !progress || !progressText || !preview || !copy || !copyStatus || !guidance || !service || required.some(field => !field)) return;

  // Keep this order and these labels aligned with the email draft in site.js.
  const fields = [["Name", "name"], ["Company / organisation", "company"], ["Email", "email"], ["Telephone", "telephone"], ["Service", "service"], ["Project location", "location"], ["Enquiry", "details"]];
  const update = () => {
    const complete = required.filter(field => field.value.trim() && field.validity.valid).length;
    progress.value = complete;
    progressText.textContent = `${complete} of 4 required fields complete`;
    const data = new FormData(form);
    const selectedService = service.selectedOptions[0];
    const serviceName = selectedService?.textContent || data.get("service");
    preview.value = fields.map(([label, key]) => `${label}: ${key === "service" ? serviceName : data.get(key) || "Not provided"}`).join("\n");
    guidance.textContent = selectedService?.dataset.guidance || "Choose a service to see how we can support your project.";
    guidance.hidden = false;
    copyStatus.textContent = "";
  };
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  copy.addEventListener("click", async () => {
    if (!form.reportValidity()) return;
    update();
    const body = preview.value;
    copy.disabled = true;
    try {
      await navigator.clipboard.writeText(body);
      copyStatus.textContent = body === preview.value
        ? "Enquiry copied. Paste it into your email."
        : "Previous enquiry copied. Copy again to include your latest changes.";
    } catch {
      const details = preview.closest("details");
      if (details) details.open = true;
      copyStatus.textContent = "Copy was unavailable. Select the preview text and copy it manually.";
    } finally {
      copy.disabled = false;
    }
  });
  update();
  tools.hidden = false;
})();
