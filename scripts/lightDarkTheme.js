const lightThemeRadio = document.getElementById("light-theme-radio");
const darkThemeRadio = document.getElementById("dark-theme-radio");
const systemThemeRadio = document.getElementById("system-theme-radio");
let currentCheckedRadio = null;

const Themes = Object.freeze({
  LIGHT: "LIGHT",
  DARK: "DARK",
  SYSTEM: "SYSTEM",
});

const initializeThemeRadios = () => {
  lightThemeRadio.onchange = () => setTheme(Themes.LIGHT);
  darkThemeRadio.onchange = () => setTheme(Themes.DARK);
  systemThemeRadio.onchange = () => setTheme(Themes.SYSTEM);
};

const setTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme)
  localStorage.theme = theme;
  checkThemeRadio(theme);
};

/** Align UI state of theme picker with whatever the current theme is */
checkThemeRadio = (theme) => {
  let radio;
  switch (localStorage.theme) {
    case Themes.LIGHT:
      radio = lightThemeRadio;
      break;
    case Themes.DARK:
      radio = darkThemeRadio;
      break;
    case Themes.SYSTEM:
    default:
      radio = systemThemeRadio;
      break;
  }
  if (currentCheckedRadio) {
    currentCheckedRadio.parentElement.removeAttribute("data-checked");
  }
  radio.checked = true;
  radio.parentElement.setAttribute("data-checked", "true");
  currentCheckedRadio = radio;
}

initializeThemeRadios();
setTheme(localStorage.theme);