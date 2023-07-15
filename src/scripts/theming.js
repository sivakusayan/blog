const lightThemeButton = document.getElementById("light-theme-button");
const darkThemeButton = document.getElementById("dark-theme-button");
const systemThemeButton = document.getElementById("system-theme-button");
let currentToggledButton = systemThemeButton;

const Themes = Object.freeze({
  LIGHT: "LIGHT",
  DARK: "DARK",
  SYSTEM: "SYSTEM",
});

const setTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.theme = theme;

  if (currentToggledButton) {
    currentToggledButton.setAttribute("aria-pressed", "false");
  }
  switch (theme) {
    case Themes.LIGHT:
      currentToggledButton = lightThemeButton;
      break;
    case Themes.DARK:
      currentToggledButton = darkThemeButton;
      break;
    case Themes.SYSTEM:
      currentToggledButton = systemThemeButton;
      break;
    default:
      break;
  }
  currentToggledButton.setAttribute("aria-pressed", "true");
};

const onThemeButtonClick = (e, theme) => {
  const { top } = e.currentTarget.getBoundingClientRect();
  setTheme(theme);
  const { top: newTop } = e.currentTarget.getBoundingClientRect();
  window.scrollBy({
    top: newTop - top,
    behavior: "instant"
  });
};

lightThemeButton.onclick = (e) => onThemeButtonClick(e, Themes.LIGHT);
darkThemeButton.onclick = (e) => onThemeButtonClick(e, Themes.DARK);
systemThemeButton.onclick = (e) => onThemeButtonClick(e, Themes.SYSTEM);
if ("theme" in localStorage) setTheme(localStorage.theme);