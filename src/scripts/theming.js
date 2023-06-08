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

lightThemeButton.onclick = (e) => setTheme(Themes.LIGHT);
darkThemeButton.onclick = (e) => setTheme(Themes.DARK);
systemThemeButton.onclick = (e) => setTheme(Themes.SYSTEM);
if ("theme" in localStorage) setTheme(localStorage.theme);
