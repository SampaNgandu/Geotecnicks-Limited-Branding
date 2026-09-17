const EXCLUDED_SERVICE_WORDS = /\b(?:constructions?|environmental)\b/i;
const SERVICE_KEYS = ['slug', 'title', 'tagline', 'summary', 'details', 'deliverables'];
const PROJECT_KEYS = ['title', 'year', 'category', 'scope', 'partner'];

function fail(path, message) {
  throw new Error(`Invalid site content: ${path} ${message}.`);
}

function object(value, path, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(path, 'must be an object');
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) fail(`${path}.${key}`, 'is required');
  }
  for (const key of Object.keys(value).sort()) {
    if (!keys.includes(key)) fail(`${path}.${key}`, 'is not a supported field');
  }
}

function list(value, path, maximum) {
  if (!Array.isArray(value)) fail(path, 'must be an array');
  if (value.length < 1 || value.length > maximum) {
    fail(path, `must contain between 1 and ${maximum} entries`);
  }
}

function string(value, path, maximum) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(path, 'must be a nonempty string');
  }
  if (value.length > maximum) fail(path, `must be at most ${maximum} characters`);
  if (EXCLUDED_SERVICE_WORDS.test(value)) {
    fail(path, 'must not mention construction or environmental services');
  }
}

function unique(seen, value, path) {
  const key = value.trim().normalize('NFKC').toLocaleLowerCase('en');
  if (seen.has(key)) fail(path, 'must be unique (ignoring case and surrounding spaces)');
  seen.add(key);
}

/** Validate editable public content before rendering any pages. Returns the input unchanged. */
export function validateContent(content) {
  object(content, 'content', ['services', 'projects', 'expertise']);
  const { services, projects, expertise } = content;
  list(services, 'services', 50);
  list(projects, 'projects', 250);
  list(expertise, 'expertise', 100);

  const serviceSlugs = new Set();
  const serviceTitles = new Set();
  services.forEach((service, index) => {
    const path = `services[${index}]`;
    object(service, path, SERVICE_KEYS);
    string(service.slug, `${path}.slug`, 80);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(service.slug)) {
      fail(`${path}.slug`, 'must use lowercase letters or digits separated by single hyphens');
    }
    unique(serviceSlugs, service.slug, `${path}.slug`);
    string(service.title, `${path}.title`, 200);
    unique(serviceTitles, service.title, `${path}.title`);
    string(service.tagline, `${path}.tagline`, 200);
    string(service.summary, `${path}.summary`, 2000);

    list(service.details, `${path}.details`, 30);
    service.details.forEach((detail, detailIndex) => {
      const detailPath = `${path}.details[${detailIndex}]`;
      if (!Array.isArray(detail) || detail.length !== 2) {
        fail(detailPath, 'must be a two-item array containing a label and description');
      }
      string(detail[0], `${detailPath}[0]`, 200);
      string(detail[1], `${detailPath}[1]`, 4000);
    });

    list(service.deliverables, `${path}.deliverables`, 30);
    service.deliverables.forEach((deliverable, deliverableIndex) => {
      string(deliverable, `${path}.deliverables[${deliverableIndex}]`, 500);
    });
  });

  const projectTitles = new Set();
  projects.forEach((project, index) => {
    const path = `projects[${index}]`;
    object(project, path, PROJECT_KEYS);
    string(project.title, `${path}.title`, 200);
    unique(projectTitles, project.title, `${path}.title`);
    string(project.year, `${path}.year`, 4);
    if (!/^\d{4}$/.test(project.year)) fail(`${path}.year`, 'must be a four-digit year string');
    string(project.category, `${path}.category`, 200);
    if (!['Mining', 'Geotechnical'].includes(project.category)) {
      fail(`${path}.category`, 'must be Mining or Geotechnical');
    }
    string(project.scope, `${path}.scope`, 2000);
    string(project.partner, `${path}.partner`, 2000);
  });

  const expertiseNames = new Set();
  expertise.forEach((entry, index) => {
    const path = `expertise[${index}]`;
    string(entry, path, 200);
    unique(expertiseNames, entry, path);
  });

  return content;
}
