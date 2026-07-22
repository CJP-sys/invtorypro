/**
 * Shared color-theme controller for the login and application pages.
 * Persists an explicit choice and otherwise follows the operating system.
 */
const THEME_KEY = 'inventory-pro-theme';
const root = document.documentElement;

function preferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    const isDark = theme === 'dark';
    button.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
    button.setAttribute('title', `Switch to ${isDark ? 'light' : 'dark'} mode`);
    button.setAttribute('aria-pressed', String(isDark));
    button.querySelector('[data-theme-label]')?.replaceChildren(isDark ? 'Light' : 'Dark');
  });
}

applyTheme(preferredTheme());

document.querySelectorAll('[data-theme-toggle]').forEach(button => {
  button.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
});

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
  if (!localStorage.getItem(THEME_KEY)) applyTheme(event.matches ? 'dark' : 'light');
});
