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

function showAdminFeedback(message, type = "error") {
  const feedback = document.getElementById("admin-feedback");

  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.className = `status-message is-${type}`;
}

function clearAdminFeedback() {
  const feedback = document.getElementById("admin-feedback");

  if (!feedback) {
    return;
  }

  feedback.textContent = "";
  feedback.className = "status-message hidden";
}

function setAdminListState({ loading, empty, list }) {
  document.getElementById("admin-projects-loading")?.classList.toggle("hidden", !loading);
  document.getElementById("admin-projects-empty")?.classList.toggle("hidden", !empty);
  document.getElementById("admin-projects-list")?.classList.toggle("hidden", !list);
}

function setSubmitLoading(isLoading) {
  const submitButton = document.getElementById("submit-button");

  if (!submitButton) {
    return;
  }

  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Saving Project..." : "Add Project";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(dateString) {
  if (!dateString) {
    return "No date";
  }

  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function createAdminProjectCard(project) {
  const card = document.createElement("article");
  card.className = "admin-project-card";
  card.innerHTML = `
    <img src="${project.image_url}" alt="${escapeHtml(project.title)} thumbnail" loading="lazy">
    <div class="admin-project-card__content">
      <div class="admin-project-card__title-row">
        <div>
          <h3>${escapeHtml(project.title)}</h3>
          <p>Added ${formatDate(project.created_at)}</p>
        </div>
        <button class="button button--danger" type="button" data-delete-id="${project.id}">
          Delete
        </button>
      </div>
      <p>${escapeHtml(project.description)}</p>
      <div class="admin-project-card__meta">
        ${
          project.project_link
            ? `<a href="${project.project_link}" target="_blank" rel="noreferrer">Open project link</a>`
            : `<span>No project link added</span>`
        }
      </div>
    </div>
  `;

  return card;
}

async function renderAdminProjects(options = {}) {
  const { fetchProjects, createFriendlyErrorMessage } = window.supabaseHelpers;
  const projectList = document.getElementById("admin-projects-list");
  const { clearFeedback = true } = options;

  if (clearFeedback) {
    clearAdminFeedback();
  }
  setAdminListState({ loading: true, empty: false, list: false });

  const { data, error } = await fetchProjects();

  if (error) {
    setAdminListState({ loading: false, empty: true, list: false });
    showAdminFeedback(
      createFriendlyErrorMessage(
        error,
        "Unable to load saved projects. Please verify your Supabase setup."
      )
    );
    return;
  }

  projectList.innerHTML = "";

  if (!data.length) {
    setAdminListState({ loading: false, empty: true, list: false });
    return;
  }

  data.forEach((project) => {
    projectList.appendChild(createAdminProjectCard(project));
  });

  setAdminListState({ loading: false, empty: false, list: true });
}

function getFormValues() {
  return {
    title: document.getElementById("title")?.value.trim() || "",
    description: document.getElementById("description")?.value.trim() || "",
    image: document.getElementById("image")?.files?.[0] || null,
    projectLink: document.getElementById("project-link")?.value.trim() || "",
  };
}

function isValidUrl(url) {
  if (!url) {
    return true;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function handleProjectSubmit(event) {
  event.preventDefault();
  clearAdminFeedback();

  const { title, description, image, projectLink } = getFormValues();

  if (!title || !description || !image) {
    showAdminFeedback("Please complete the title, description, and image fields.");
    return;
  }

  if (!isValidUrl(projectLink)) {
    showAdminFeedback("Project link must be a valid http or https URL.");
    return;
  }

  const {
    uploadProjectImage,
    createProject,
    removeImageFromStorage,
    createFriendlyErrorMessage,
  } = window.supabaseHelpers;

  setSubmitLoading(true);

  try {
    const { data: imageData, error: uploadError } = await uploadProjectImage(image);

    if (uploadError) {
      throw new Error(
        `Image upload failed: ${createFriendlyErrorMessage(
          uploadError,
          "Please try again."
        )}`
      );
    }

    const { error: insertError } = await createProject({
      title,
      description,
      image_url: imageData.publicUrl,
      project_link: projectLink || null,
    });

    if (insertError) {
      await removeImageFromStorage(imageData.publicUrl);
      throw new Error(
        `Database insert failed: ${createFriendlyErrorMessage(
          insertError,
          "Project could not be saved. Please try again."
        )}`
      );
    }

    document.getElementById("project-form")?.reset();
    showAdminFeedback("Project added successfully.", "success");
    await renderAdminProjects({ clearFeedback: false });
  } catch (error) {
    showAdminFeedback(error.message || "Something went wrong while saving the project.");
  } finally {
    setSubmitLoading(false);
  }
}

async function handleDeleteClick(event) {
  const deleteButton = event.target.closest("[data-delete-id]");

  if (!deleteButton) {
    return;
  }

  const projectId = Number(deleteButton.dataset.deleteId);
  const card = deleteButton.closest(".admin-project-card");
  const imageElement = card?.querySelector("img");
  const imageUrl = imageElement?.getAttribute("src") || "";

  if (!window.confirm("Are you sure you want to delete this project?")) {
    return;
  }

  const {
    deleteProjectById,
    removeImageFromStorage,
    createFriendlyErrorMessage,
  } = window.supabaseHelpers;

  deleteButton.disabled = true;
  deleteButton.textContent = "Deleting...";
  clearAdminFeedback();

  try {
    const { error: deleteError } = await deleteProjectById(projectId);

    if (deleteError) {
      throw new Error(
        createFriendlyErrorMessage(deleteError, "Project could not be deleted.")
      );
    }

    const { error: storageError } = await removeImageFromStorage(imageUrl);

    if (storageError) {
      console.warn("Storage cleanup skipped:", storageError.message);
    }

    showAdminFeedback("Project deleted successfully.", "success");
    await renderAdminProjects({ clearFeedback: false });
  } catch (error) {
    showAdminFeedback(error.message || "Something went wrong while deleting the project.");
    deleteButton.disabled = false;
    deleteButton.textContent = "Delete";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  renderAdminProjects();
  document.getElementById("project-form")?.addEventListener("submit", handleProjectSubmit);
  document.getElementById("admin-projects-list")?.addEventListener("click", handleDeleteClick);
});
