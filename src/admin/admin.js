(() => {
  "use strict";

  const names = ["services", "projects", "expertise"];
  const $ = selector => document.querySelector(selector);
  const titles = { services: "Services", projects: "Project experience", expertise: "Our expertise" };
  const descriptions = {
    services: "Explain what you do, how you work and what clients receive.",
    projects: "Keep project names, dates and your team's involvement accurate.",
    expertise: "One capability per line. Keep each description clear and specific."
  };
  let config;
  let token = "";
  let head = "";
  let baseTree = "";
  let data;
  let baseline = "";
  let section = "services";
  let busy = false;
  let conflict = false;
  let fieldId = 0;
  const dirty = () => Boolean(data && baseline && JSON.stringify(data) !== baseline);
  const connected = () => Boolean(token && head);
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const status = (message, kind = "") => {
    $("#status").textContent = message;
    $("#status").className = `status ${kind}`;
  };
  function updateControls() {
    const authenticated = connected();
    $("#connect-form").hidden = authenticated || !config;
    $("#connected-actions").hidden = !authenticated;
    $("#connect-button").disabled = busy;
    $("#github-token").disabled = busy;
    $("#reload-button").disabled = busy;
    $("#disconnect-button").disabled = busy;
    $("#editor-fields").disabled = !authenticated || busy || conflict;
    $("#save-button").disabled = !authenticated || busy || conflict || !dirty();
    $("#download-draft").hidden = !dirty();
    $("#download-draft").disabled = busy;
    $("#save-button").textContent = busy && authenticated ? "Working…" : "Save all changes";
    $("#connection-badge").textContent = authenticated ? "Connected to GitHub" : "Preview mode";
    $("#connection-badge").className = `badge${authenticated ? " connected" : ""}`;
    $("#change-indicator").textContent = conflict ? "Reload required" : !authenticated ? "Read-only preview" : dirty() ? "Unsaved changes" : "Up to date";
    $("#change-indicator").className = `badge${dirty() ? " changed" : ""}`;
    $("#save-help").textContent = conflict ? "The branch has changed. Download your unsaved draft before reloading the latest content." : !authenticated && dirty() ? "Your unsaved draft is still here. Download it before reconnecting, which loads the latest GitHub content." : !authenticated ? "Connect to GitHub to make changes." : dirty() ? "Save commits all three content sections together to the configured branch." : "Your content matches the loaded GitHub version.";
    document.querySelectorAll("[data-section]").forEach(button => {
      button.disabled = busy;
      button.setAttribute("aria-pressed", String(button.dataset.section === section));
    });
    if (data) names.forEach(name => { $(`[data-count="${name}"]`).textContent = String(data[name].length); });
  }

  function textField(container, labelText, value, onInput, options = {}) {
    const wrapper = element("div", "field");
    const id = `content-field-${++fieldId}`;
    const label = element("label", "", labelText);
    label.htmlFor = id;
    const input = element(options.multiline ? "textarea" : "input");
    input.id = id;
    input.value = value;
    input.required = true;
    input.maxLength = options.maxLength || 200;
    if (!options.multiline) input.type = "text";
    if (options.pattern) input.pattern = options.pattern;
    if (options.rows) input.rows = options.rows;
    input.addEventListener("input", () => { onInput(input.value); updateControls(); });
    wrapper.append(label, input);
    if (options.help) {
      const help = element("p", "help", options.help);
      help.id = `${id}-help`;
      input.setAttribute("aria-describedby", help.id);
      wrapper.append(help);
    }
    container.append(wrapper);
    return input;
  }

  function action(label, className, callback) {
    const button = element("button", className, label);
    button.type = "button";
    button.addEventListener("click", callback);
    return button;
  }

  function render() {
    if (!data) return;
    $("#editor-form").hidden = false;
    $("#section-nav").hidden = false;
    $("#editor-title").textContent = titles[section];
    $("#editor-description").textContent = descriptions[section];
    const container = $("#editor-content");
    container.replaceChildren();
    if (section === "expertise") {
      const card = element("div", "entry-card");
      textField(card, "Expertise areas", data.expertise.join("\n"), value => {
        data.expertise = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      }, { multiline: true, rows: 12, maxLength: 20100, help: "Add or remove a line to add or remove a capability. Up to 100 capabilities; 200 characters per line." });
      container.append(card);
    } else {
      data[section].forEach((item, index) => {
        const singular = section === "services" ? "Service" : "Project";
        const prefix = `${singular} ${index + 1}`;
        const card = element("article", "entry-card");
        const header = element("div", "entry-header");
        const heading = element("div");
        heading.append(element("p", "entry-index", `${singular} ${String(index + 1).padStart(2, "0")}`), element("h3", "", item.title || `New ${singular.toLowerCase()}`));
        const remove = action("Remove", "remove-button", () => {
          if (!window.confirm(`Remove ${item.title || "this entry"}? This takes effect only when you save.`)) return;
          data[section].splice(index, 1);
          render();
          $("#editor-title").setAttribute("tabindex", "-1");
          $("#editor-title").focus();
        });
        remove.setAttribute("aria-label", `Remove ${prefix.toLowerCase()}`);
        header.append(heading, remove);
        card.append(header);
        textField(card, `${prefix} title`, item.title, value => { item.title = value; heading.querySelector("h3").textContent = value || `New ${singular.toLowerCase()}`; });
        if (section === "services") {
          const grid = element("div", "field-grid");
          textField(grid, `${prefix} page anchor`, item.slug, value => { item.slug = value; }, { maxLength: 80, pattern: "[a-z0-9]+(-[a-z0-9]+)*", help: "Lowercase words separated by hyphens. Existing links use this value." });
          textField(grid, `${prefix} short tagline`, item.tagline, value => { item.tagline = value; });
          card.append(grid);
          textField(card, `${prefix} summary`, item.summary, value => { item.summary = value; }, { multiline: true, maxLength: 2000 });
          const details = element("div", "detail-group");
          details.append(element("h3", "", "How we help"));
          item.details.forEach((detail, detailIndex) => {
            const row = element("div", "detail-row");
            textField(row, `${prefix} detail ${detailIndex + 1} heading`, detail[0], value => { detail[0] = value; });
            textField(row, `${prefix} detail ${detailIndex + 1} description`, detail[1], value => { detail[1] = value; }, { multiline: true, maxLength: 4000 });
            row.append(action(`Remove detail ${detailIndex + 1}`, "remove-button", () => { item.details.splice(detailIndex, 1); render(); focusAddedOrLast(".detail-group button"); }));
            details.append(row);
          });
          details.append(action("+ Add a service detail", "add-button", () => {
            if (item.details.length >= 30) return status("Each service can contain up to 30 details.", "error");
            item.details.push(["", ""]); render();
            const cards = $("#editor-content").querySelectorAll("article");
            cards[index].querySelector(".detail-row:last-of-type input")?.focus();
          }));
          card.append(details);
          textField(card, `${prefix} deliverables`, item.deliverables.join("\n"), value => {
            item.deliverables = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
          }, { multiline: true, maxLength: 15030, rows: 4, help: "One deliverable per line. Up to 30 deliverables; 500 characters per line." });
        } else {
          const grid = element("div", "field-grid");
          textField(grid, `${prefix} year`, item.year, value => { item.year = value; }, { maxLength: 4, pattern: "[0-9]{4}" });
          const wrapper = element("div", "field");
          const label = element("label", "", `${prefix} category`);
          const select = element("select");
          select.id = `content-field-${++fieldId}`;
          label.htmlFor = select.id;
          for (const category of ["Mining", "Geotechnical"]) { const option = element("option", "", category); option.value = category; select.append(option); }
          select.value = item.category;
          select.addEventListener("change", () => { item.category = select.value; updateControls(); });
          wrapper.append(label, select); grid.append(wrapper); card.append(grid);
          textField(card, `${prefix} scope`, item.scope, value => { item.scope = value; }, { multiline: true, maxLength: 2000 });
          textField(card, `${prefix} delivery credit`, item.partner, value => { item.partner = value; }, { multiline: true, maxLength: 2000, help: "State your company's role accurately and use client names only with permission." });
        }
        container.append(card);
      });
      container.append(action(section === "services" ? "+ Add a service" : "+ Add a project", "add-button", () => {
        const cap = section === "services" ? 50 : 250;
        if (data[section].length >= cap) return status(`You can add up to ${cap} ${section}.`, "error");
        data[section].push(section === "services" ? { slug: "", title: "", tagline: "", summary: "", details: [["", ""]], deliverables: [] } : { title: "", year: "", category: "Mining", scope: "", partner: "" });
        render();
        $("#editor-content").querySelector("article:last-of-type input")?.focus();
      }));
    }
    updateControls();
  }

  function focusAddedOrLast(selector) { $("#editor-content").querySelector(selector)?.focus(); }
  function validate(content) {
    const fail = message => { throw new Error(message); };
    const list = (value, min, max, label) => { if (!Array.isArray(value) || value.length < min || value.length > max) fail(`${label} must contain ${min}–${max} entries.`); };
    const text = (value, max, label) => {
      if (typeof value !== "string" || !value.trim() || value.length > max) fail(`${label} is required and must be at most ${max} characters.`);
      if (/\b(?:constructions?|environmental)\b/i.test(value)) fail(`${label} includes a service area excluded from this website. Remove construction or environmental references.`);
    };
    const keys = (item, expected, label) => {
      if (!item || typeof item !== "object" || Array.isArray(item) || Object.keys(item).sort().join() !== expected.sort().join()) fail(`${label} has an unsupported format. Update the website editor before saving.`);
    };
    const unique = (values, label) => { if (new Set(values.map(value => value.trim().normalize("NFKC").toLocaleLowerCase("en"))).size !== values.length) fail(`${label} must be unique.`); };
    keys(content, [...names], "Content");
    list(content.services, 1, 50, "Services");
    list(content.projects, 1, 250, "Projects");
    list(content.expertise, 1, 100, "Expertise");
    content.services.forEach((item, index) => {
      const label = `Service ${index + 1}`;
      keys(item, ["slug", "title", "tagline", "summary", "details", "deliverables"], label);
      text(item.slug, 80, `${label} page anchor`);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)) fail(`${label} page anchor must use lowercase words separated by hyphens.`);
      for (const field of ["title", "tagline"]) text(item[field], 200, `${label} ${field}`);
      text(item.summary, 2000, `${label} summary`);
      list(item.details, 1, 30, `${label} details`);
      item.details.forEach((pair, i) => { list(pair, 2, 2, `${label} detail ${i + 1}`); text(pair[0], 200, `${label} detail ${i + 1} heading`); text(pair[1], 4000, `${label} detail ${i + 1} description`); });
      list(item.deliverables, 1, 30, `${label} deliverables`);
      item.deliverables.forEach(value => text(value, 500, `${label} deliverable`));
    });
    unique(content.services.map(item => item.slug), "Service page anchors");
    unique(content.services.map(item => item.title), "Service titles");
    content.projects.forEach((item, index) => {
      const label = `Project ${index + 1}`;
      keys(item, ["title", "year", "category", "scope", "partner"], label);
      text(item.title, 200, `${label} title`);
      if (typeof item.year !== "string" || !/^\d{4}$/.test(item.year)) fail(`${label} year must contain four digits.`);
      if (!["Mining", "Geotechnical"].includes(item.category)) fail(`${label} category must be Mining or Geotechnical.`);
      for (const field of ["scope", "partner"]) text(item[field], 2000, `${label} ${field}`);
    });
    unique(content.projects.map(item => item.title), "Project titles");
    content.expertise.forEach(value => text(value, 200, "Expertise area"));
    unique(content.expertise, "Expertise areas");
  }

  function clearSession() {
    token = ""; head = ""; baseTree = ""; conflict = false;
    $("#github-token").value = "";
  }
  function sha(value) {
    if (typeof value !== "string" || !/^[a-f0-9]{40,64}$/.test(value)) throw new Error("GitHub returned an unexpected content version. Reload before editing.");
    return value;
  }
  async function api(path, method = "GET", body) {
    // Paths are generated below, never taken from API response URLs or user input.
    const url = `https://api.github.com/repos/${config.repository}/${path}`;
    let response;
    try {
      response = await fetch(url, {
        method, credentials: "omit", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer",
        headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2026-03-10", ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
    } catch { throw new Error("Could not reach GitHub. Check your connection. Your edits are still on this page; reload from GitHub before retrying if a save was interrupted."); }
    if (!response.ok) {
      if (response.status === 401) { clearSession(); throw new Error("GitHub rejected that token. Connect again with a valid, unexpired token."); }
      if (response.status === 429 || response.status === 403 && (response.headers.get("x-ratelimit-remaining") === "0" || response.headers.has("retry-after"))) throw new Error("GitHub's request limit has been reached. Wait before trying again. Your changes have not been published.");
      if (response.status === 403) throw new Error("GitHub denied this action. Check Contents: read and write permission, organization approval and branch protection. Your edits remain on this page.");
      if (response.status === 409 || response.status === 422) { conflict = true; throw new Error("GitHub could not safely update this branch. It may have changed or be protected. Reload the latest content before editing again."); }
      if (response.status === 404) throw new Error("The configured branch or content files are unavailable to this token. Check repository access and ensure the content editor changes are on GitHub.");
      throw new Error(`GitHub could not complete this action (${response.status}). Your edits remain on this page.`);
    }
    return response.json();
  }
  const refPath = () => `heads/${config.branch.split("/").map(encodeURIComponent).join("/")}`;
  async function currentHead() { return sha((await api(`git/ref/${refPath()}`)).object?.sha); }
  async function loadRemote() {
    const nextHead = await currentHead();
    const nextData = {};
    for (const name of names) {
      const file = await api(`contents/src/data/${name}.json?ref=${nextHead}`);
      if (file.type !== "file" || file.encoding !== "base64" || typeof file.content !== "string") throw new Error("GitHub returned an unsupported content file. No content has been changed.");
      const bytes = Uint8Array.from(atob(file.content.replace(/\s/g, "")), char => char.charCodeAt(0));
      try { nextData[name] = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
      catch { throw new Error(`The ${name} content file could not be read. Fix its JSON format in GitHub before editing here.`); }
    }
    validate(nextData);
    const commit = await api(`git/commits/${nextHead}`);
    const nextTree = sha(commit.tree?.sha);
    // Only replace the editor after every file has been read and validated.
    data = nextData; baseline = JSON.stringify(data); head = nextHead; baseTree = nextTree; conflict = false;
    render();
  }
  async function withBusy(work) {
    if (busy) return;
    busy = true; updateControls();
    try { await work(); }
    catch (error) { status(error.message || "This action could not be completed. Your changes have not been published.", "error"); }
    finally { busy = false; updateControls(); }
  }

  $("#connect-form").addEventListener("submit", event => {
    event.preventDefault();
    if (busy) return;
    const entered = $("#github-token").value.trim();
    $("#github-token").value = "";
    if (!entered) return;
    if (dirty() && !window.confirm("Connecting reloads the latest GitHub content and discards your unsaved draft. Cancel and download the draft first if you need to keep it. Continue?")) return;
    token = entered;
    withBusy(async () => {
      status("Checking repository access and loading the latest content…");
      try {
        const repository = await api("");
        if (!repository.permissions?.push) throw new Error("This GitHub account does not have write access to the website repository. Ask the repository owner to grant access.");
        await api(`contents/src/data/services.json?ref=${encodeURIComponent(config.branch)}`);
        await loadRemote();
        status("Connected. You are editing the latest content from the configured GitHub branch. Changes stay on this page until you save.", "success");
      } catch (error) { clearSession(); throw error; }
    });
  });

  $("#reload-button").addEventListener("click", () => {
    if (dirty() && !window.confirm("Reload from GitHub and discard your unsaved changes? Copy any text you want to keep before continuing.")) return;
    withBusy(async () => { status("Loading the latest content from GitHub…"); await loadRemote(); status("Latest content loaded. You can continue editing.", "success"); });
  });
  $("#disconnect-button").addEventListener("click", () => {
    if (dirty() && !window.confirm("Disconnect and discard your unsaved changes?")) return;
    clearSession();
    if (baseline) data = JSON.parse(baseline);
    render(); status("Disconnected. Your access token has been cleared. Content is now read-only.");
    $("#github-token").focus();
  });
  $("#download-draft").addEventListener("click", () => {
    if (!data || !dirty() || busy) return;
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "geotecnicks-content-draft.json";
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status("Draft downloaded with all three content sections. It contains no access token. You can use it to restore your wording after reloading.");
  });
  document.querySelectorAll("[data-section]").forEach(button => button.addEventListener("click", () => { section = button.dataset.section; render(); }));

  $("#editor-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!connected() || busy || conflict || !dirty()) return;
    withBusy(async () => {
      validate(data);
      status("Checking the latest branch version before saving…");
      if (await currentHead() !== head) { conflict = true; throw new Error("Someone updated the branch since you loaded it. Nothing was overwritten. Copy any edits you need, then reload the latest content."); }
      const snapshot = JSON.stringify(data);
      const treeEntries = [];
      for (const name of names) {
        const blob = await api("git/blobs", "POST", { content: `${JSON.stringify(data[name], null, 2)}\n`, encoding: "utf-8" });
        treeEntries.push({ path: `src/data/${name}.json`, mode: "100644", type: "blob", sha: sha(blob.sha) });
      }
      const tree = await api("git/trees", "POST", { base_tree: baseTree, tree: treeEntries });
      const nextTree = sha(tree.sha);
      const commit = await api("git/commits", "POST", { message: "Update website content from admin", tree: nextTree, parents: [head] });
      const nextHead = sha(commit.sha);
      // Recheck immediately before publication of the commit. force:false also
      // prevents a concurrent commit from being overwritten during this request.
      if (await currentHead() !== head) { conflict = true; throw new Error("The branch changed while preparing your save. Nothing was overwritten. Reload the latest content before continuing."); }
      await api(`git/refs/${refPath()}`, "PATCH", { sha: nextHead, force: false });
      head = nextHead; baseTree = nextTree; baseline = snapshot;
      status(`Saved all content to GitHub (${head.slice(0, 7)}). Review the build and publish through your hosting workflow. This does not merge the pull request or update this local preview.`, "success");
    });
  });
  window.addEventListener("beforeunload", event => { if (dirty()) { event.preventDefault(); event.returnValue = ""; } });
  window.addEventListener("pagehide", () => { clearSession(); updateControls(); });

  async function init() {
    try {
      const response = await fetch("/admin/config.json", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error("The content editor configuration is unavailable. Rebuild the website and try again.");
      const settings = await response.json();
      if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(settings.repository || "") || typeof settings.branch !== "string" || !/^[A-Za-z0-9_./-]+$/.test(settings.branch) || settings.branch.includes("..") || settings.branch.endsWith("/") || settings.branch.startsWith("/")) throw new Error("The content editor configuration is invalid. No GitHub connection has been made.");
      config = { repository: settings.repository, branch: settings.branch };
      $("#destination").textContent = `${config.repository} · Branch: ${config.branch}`;
      const preview = {};
      for (const name of names) {
        const result = await fetch(`/admin/content/${name}.json`, { cache: "no-store", credentials: "same-origin" });
        if (!result.ok) throw new Error("The bundled content preview is unavailable. Connect to GitHub to load the latest content.");
        preview[name] = await result.json();
      }
      validate(preview); data = preview; baseline = JSON.stringify(data); render();
      status("Read-only preview of the content included in this build. Connect to GitHub to load the latest version and edit.");
    } catch (error) { status(error.message, "error"); }
    updateControls();
  }
  init();
})();
