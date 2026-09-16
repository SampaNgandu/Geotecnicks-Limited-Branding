const menuButton = document.querySelector(".menu");
const navigation = document.querySelector("#site-nav");
if (menuButton && navigation) {
  menuButton.hidden = false;
  navigation.setAttribute("data-enhanced", "");
  menuButton.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!open));
    navigation.toggleAttribute("data-open", !open);
  });
  navigation.addEventListener("click", event => {
    if (event.target.closest("a")) {
      menuButton.setAttribute("aria-expanded", "false");
      navigation.removeAttribute("data-open");
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && navigation.hasAttribute("data-open")) {
      menuButton.setAttribute("aria-expanded", "false");
      navigation.removeAttribute("data-open");
      menuButton.focus();
    }
  });
}

document.querySelectorAll("[data-year]").forEach(node => { node.textContent = new Date().getFullYear(); });

const form = document.querySelector("#enquiry-form");
if (form) {
form.addEventListener("submit", event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const fields = [["Name","name"],["Company / organisation","company"],["Email","email"],["Telephone","telephone"],["Service","service"],["Project location","location"],["Enquiry","details"]];
  const body = fields.map(([label,key]) => `${label}: ${data.get(key) || "Not provided"}`).join("\n");
  window.location.href = `mailto:geotecnicks.limited@gmail.com?subject=${encodeURIComponent(`Website enquiry — ${data.get("service")}`)}&body=${encodeURIComponent(body)}`;
});

// Enable only after the submit handler is attached; without JS no data enters a URL.
form.hidden = false;
}
