import type { DigitalProductProject } from '../types/project.ts';

const ACTIVE_PROJECT_KEY = 'dps_active_project_id_v1';
const SAVED_PROJECTS_KEY = 'dps_saved_projects_v1';
const UI_LANG_KEY = 'dps_ui_lang_v1';

/**
 * Strip sensitive API keys before persisting project state to workspace storage.
 * Keys live exclusively under dedicated `dpc_key_*` keys in localStorage.
 */
export function sanitizeProjectForStorage(project: DigitalProductProject): DigitalProductProject {
  return {
    ...project,
    aiSettings: {
      ...project.aiSettings,
      apiKey: '',
      apiKeys: {
        openrouter: '',
        gemini: '',
        openai: '',
        claude: '',
      },
    },
  };
}

export function upsertSavedProject(
  projects: DigitalProductProject[],
  project: DigitalProductProject
): DigitalProductProject[] {
  const clean = sanitizeProjectForStorage(project);
  const existingIndex = projects.findIndex((p) => p.projectId === clean.projectId);
  if (existingIndex >= 0) {
    const next = [...projects];
    next[existingIndex] = clean;
    return next;
  }
  return [clean, ...projects];
}

export function removeSavedProject(
  projects: DigitalProductProject[],
  projectId: string
): DigitalProductProject[] {
  return projects.filter((p) => p.projectId !== projectId);
}

export function loadSavedProjectsFromStorage(): DigitalProductProject[] {
  try {
    const raw = localStorage.getItem(SAVED_PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p) => p && typeof p.projectId === 'string') : [];
  } catch {
    return [];
  }
}

export function saveProjectsToStorage(projects: DigitalProductProject[], activeId: string): void {
  try {
    const sanitized = projects.map(sanitizeProjectForStorage);
    localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(sanitized));
    localStorage.setItem(ACTIVE_PROJECT_KEY, activeId);
  } catch (err) {
    console.warn('Could not persist projects to localStorage:', err);
  }
}

export function loadInitialProjectFromStorage(fallback: DigitalProductProject): {
  activeProject: DigitalProductProject;
  savedProjects: DigitalProductProject[];
} {
  const saved = loadSavedProjectsFromStorage();
  if (!saved.length) {
    return { activeProject: fallback, savedProjects: [sanitizeProjectForStorage(fallback)] };
  }
  try {
    const activeId = localStorage.getItem(ACTIVE_PROJECT_KEY);
    const match = saved.find((p) => p.projectId === activeId) || saved[0];
    return { activeProject: match, savedProjects: saved };
  } catch {
    return { activeProject: saved[0], savedProjects: saved };
  }
}

export function loadStoredLang(): 'en' | 'zh' {
  try {
    const raw = localStorage.getItem(UI_LANG_KEY);
    return raw === 'zh' ? 'zh' : 'en';
  } catch {
    return 'en';
  }
}

export function saveStoredLang(lang: 'en' | 'zh'): void {
  try {
    localStorage.setItem(UI_LANG_KEY, lang);
  } catch {
    // ignore storage quota errors
  }
}
