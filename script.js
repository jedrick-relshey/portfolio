const THEME_STORAGE_KEY = "portfolio-theme";

function initializeTheme() {
  const toggleButton = document.getElementById("theme-toggle");
  const toggleLabel = toggleButton?.querySelector(".theme-toggle__label");
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const currentTheme = savedTheme === "dark" ? "dark" : "light";

  applyTheme(currentTheme, toggleLabel);

  toggleButton?.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
    applyTheme(nextTheme, toggleLabel);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  });
}

function applyTheme(theme, labelElement) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-mode", isDark);

  if (labelElement) {
    labelElement.textContent = isDark ? "Dark mode" : "Light mode";
  }
}

function setVisibleState({ loading, empty, grid }) {
  document.getElementById("projects-loading")?.classList.toggle("hidden", !loading);
  document.getElementById("projects-empty")?.classList.toggle("hidden", !empty);
  document.getElementById("projects-grid")?.classList.toggle("hidden", !grid);
}

function showFeedback(message, type = "error") {
  const feedback = document.getElementById("project-feedback");

  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.className = `status-message is-${type}`;
}

function clearFeedback() {
  const feedback = document.getElementById("project-feedback");

  if (!feedback) {
    return;
  }

  feedback.textContent = "";
  feedback.className = "status-message hidden";
}

function createProjectCard(project) {
  const card = document.createElement("article");
  card.className = "project-card";

  const imageMarkup = `
    <img
      class="project-card__image"
      src="${project.image_url}"
      alt="${escapeAttribute(project.title)} thumbnail"
      loading="lazy"
    >
  `;

  card.innerHTML = `
    ${
      project.project_link
        ? `<a class="project-card__image-link" href="${project.project_link}" target="_blank" rel="noreferrer">${imageMarkup}</a>`
        : `<div class="project-card__image-link">${imageMarkup}</div>`
    }
    <div class="project-card__body">
      <h3 class="project-card__title">${escapeHtml(project.title)}</h3>
      <p class="project-card__description">${escapeHtml(project.description)}</p>
      ${
        project.project_link
          ? `<a class="project-card__link" href="${project.project_link}" target="_blank" rel="noreferrer">View project</a>`
          : ""
      }
    </div>
  `;

  return card;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

async function loadProjects() {
  clearFeedback();
  setVisibleState({ loading: true, empty: false, grid: false });

  const { fetchProjects, createFriendlyErrorMessage } = window.supabaseHelpers;
  const projectsGrid = document.getElementById("projects-grid");
  const { data, error } = await fetchProjects();

  if (error) {
    setVisibleState({ loading: false, empty: true, grid: false });
    showFeedback(
      createFriendlyErrorMessage(
        error,
        "Unable to load projects right now. Please check your Supabase connection."
      )
    );
    return;
  }

  projectsGrid.innerHTML = "";

  if (!data.length) {
    setVisibleState({ loading: false, empty: true, grid: false });
    return;
  }

  data.forEach((project) => {
    projectsGrid.appendChild(createProjectCard(project));
  });

  setVisibleState({ loading: false, empty: false, grid: true });
}

function initializeScrollTopButton() {
  const scrollButton = document.getElementById("scroll-top-button");

  if (!scrollButton) {
    return;
  }

  const toggleVisibility = () => {
    const shouldShow = window.scrollY > 260;
    scrollButton.classList.toggle("hidden", !shouldShow);
  };

  window.addEventListener("scroll", toggleVisibility, { passive: true });
  toggleVisibility();

  scrollButton.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

function initializeCertificateViewer() {
  const viewer = document.getElementById("certificate-viewer");
  const viewerImage = document.getElementById("certificate-viewer-image");
  const closeButton = document.getElementById("certificate-viewer-close");
  const certificateCards = document.querySelectorAll(".certificate-card img");

  if (!viewer || !viewerImage || !closeButton || !certificateCards.length) {
    return;
  }

  certificateCards.forEach((image) => {
    image.closest(".certificate-card")?.addEventListener("click", () => {
      viewerImage.src = image.src;
      viewerImage.alt = image.alt;

      if (typeof viewer.showModal === "function") {
        viewer.showModal();
      }
    });
  });

  closeButton.addEventListener("click", () => {
    viewer.close();
  });

  viewer.addEventListener("click", (event) => {
    if (event.target === viewer) {
      viewer.close();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  initializeScrollTopButton();
  initializeCertificateViewer();
  loadProjects();
});
