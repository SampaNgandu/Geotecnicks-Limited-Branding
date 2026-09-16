const menuButton = document.querySelector(".menu");
const navigation = document.querySelector("#site-nav");
if (menuButton && navigation) {
  const closeMenu = () => {
    menuButton.setAttribute("aria-expanded", "false");
    navigation.removeAttribute("data-open");
  };
  menuButton.hidden = false;
  navigation.setAttribute("data-enhanced", "");
  menuButton.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!open));
    navigation.toggleAttribute("data-open", !open);
  });
  navigation.addEventListener("click", event => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && navigation.hasAttribute("data-open")) {
      closeMenu();
      menuButton.focus();
    }
  });
}
document.querySelectorAll("[data-year]").forEach(node => { node.textContent = new Date().getFullYear(); });

const filterButtons = [...document.querySelectorAll("[data-project-filter]")];
const projectCards = [...document.querySelectorAll("[data-project-card]")];
const projectCount = document.querySelector("[data-project-count]");
if (filterButtons.length && projectCount) {
  filterButtons[0].parentElement.hidden = false;
  filterButtons.forEach(button => button.addEventListener("click", () => {
    const category = button.dataset.projectFilter;
    filterButtons.forEach(filter => filter.setAttribute("aria-pressed", String(filter === button)));
    let visible = 0;
    projectCards.forEach(card => {
      card.hidden = category !== "all" && card.dataset.category !== category;
      if (!card.hidden) visible++;
    });
    projectCount.textContent = `${visible} ${visible === 1 ? "project" : "projects"}`;
  }));
}

const searchButton = document.querySelector(".search-toggle");
const searchDialog = document.querySelector("#search-dialog");
const searchInput = document.querySelector("#site-search");
if (searchButton && searchDialog && searchInput) {
  const items = [...searchDialog.querySelectorAll("[data-search-item]")];
  const empty = searchDialog.querySelector("[data-search-empty]");
  const filterSearch = () => {
    const query = searchInput.value.trim().toLocaleLowerCase();
    items.forEach(item => { item.hidden = !item.textContent.toLocaleLowerCase().includes(query); });
    empty.hidden = items.some(item => !item.hidden);
  };
  searchButton.hidden = false;
  searchButton.addEventListener("click", () => {
    searchInput.value = "";
    filterSearch();
    searchDialog.showModal();
    searchInput.focus();
  });
  searchInput.addEventListener("input", filterSearch);
  searchDialog.addEventListener("keydown", event => {
    // Search inputs can consume Escape to clear their value before the dialog
    // receives its native cancel action. Make one key press dismiss the modal.
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      searchDialog.close();
    }
  });
  // A result may point to a fragment on this same page, so navigation alone
  // does not close the modal. Native dialog dismissal restores opener focus.
  searchDialog.addEventListener("click", event => {
    if (event.target.closest(".search-results a")) searchDialog.close();
  });
}

const form = document.querySelector("#enquiry-form");
if (form) {
  const service = form.querySelector('select[name="service"]');
  const requested = new URLSearchParams(window.location.search || "").get("service");
  if (requested && [...service.options].some(option => option.value === requested)) service.value = requested;
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const serviceName = service.selectedOptions[0]?.textContent || data.get("service");
    const fields = [["Name","name"],["Company / organisation","company"],["Email","email"],["Telephone","telephone"],["Service","service"],["Project location","location"],["Enquiry","details"]];
    const body = fields.map(([label,key]) => `${label}: ${key === "service" ? serviceName : data.get(key) || "Not provided"}`).join("\n");
    window.location.href = `mailto:geotecnicks.limited@gmail.com?subject=${encodeURIComponent(`Website enquiry — ${serviceName}`)}&body=${encodeURIComponent(body)}`;
  });
  // Attach the handler before exposing the form, so browser GET submission cannot leak enquiry text.
  form.hidden = false;
}

