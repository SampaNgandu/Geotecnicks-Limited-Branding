(() => {
  const tools = document.querySelector("[data-project-tools]");
  const search = document.querySelector("#project-search");
  const sort = document.querySelector("#project-sort");
  const grid = document.querySelector(".project-grid");
  const count = document.querySelector("[data-project-count]");
  const empty = document.querySelector("[data-project-empty]");
  const reset = document.querySelector("[data-project-reset]");
  const filters = [...document.querySelectorAll("[data-project-filter]")];
  if (!tools || !search || !sort || !grid || !count || !empty || !reset || !filters.length) return;

  const normalize = value => value.trim().toLocaleLowerCase();
  const projects = [...grid.querySelectorAll("[data-project-card]")].map((card, index) => ({
    card,
    index,
    title: card.dataset.title || card.querySelector("h3")?.textContent || "",
    year: Number(card.dataset.year) || 0,
    text: normalize(card.textContent),
    category: card.dataset.category,
  }));
  let category = "all";

  const update = () => {
    const terms = normalize(search.value).split(/\s+/).filter(Boolean);
    const ordered = [...projects].sort((a, b) => {
      if (sort.value === "name") return a.title.localeCompare(b.title, "en") || a.index - b.index;
      const byYear = sort.value === "oldest" ? a.year - b.year : b.year - a.year;
      return byYear || a.index - b.index;
    });
    let visible = 0;
    ordered.forEach(project => {
      const matches = (category === "all" || project.category === category)
        && terms.every(term => project.text.includes(term));
      project.card.hidden = !matches;
      if (matches) visible++;
      grid.append(project.card);
    });
    filters.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.projectFilter === category)));
    count.textContent = `${visible} ${visible === 1 ? "project" : "projects"}`;
    empty.hidden = visible !== 0;
  };

  filters.forEach(button => button.addEventListener("click", () => {
    category = button.dataset.projectFilter;
    update();
  }));
  search.addEventListener("input", update);
  sort.addEventListener("change", update);
  reset.addEventListener("click", () => {
    category = "all";
    search.value = "";
    sort.value = "newest";
    update();
    // The reset disappears with the empty state, so give focus a useful home.
    search.focus();
  });

  update();
  filters[0].parentElement.hidden = false;
  tools.hidden = false;
})();
