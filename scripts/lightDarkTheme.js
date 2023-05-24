const lightThemeRadio = document.getElementById("light-theme-radio");
const darkThemeRadio = document.getElementById("dark-theme-radio");
const systemThemeRadio = document.getElementById("system-theme-radio");
let currentCheckedRadio = null;
let currentTimeoutId = null;
let recentlyChanged = false;
let recentlyChangeTimeoutId = null;

const Themes = Object.freeze({
  LIGHT: "LIGHT",
  DARK: "DARK",
  SYSTEM: "SYSTEM",
});

const initializeEventListeners = () => {
  lightThemeRadio.onchange = (e) => onThemeRadioChecked(Themes.LIGHT);
  darkThemeRadio.onchange = (e) => onThemeRadioChecked(Themes.DARK);
  systemThemeRadio.onchange = (e) => onThemeRadioChecked(Themes.SYSTEM);
};

const onThemeRadioChecked = (theme) => {
  // Only set theme on a timeout so if a user quickly arrows through
  // the theme picker the theme switch isn't jarring and flashing 
  // in their face.
  if (recentlyChanged) {
    setTheme(theme, 500);
  }
  else {
    setTheme(theme);
  }
}

const setTheme = (theme, delay) => {
  updateThemePickerSelection(theme)
  if (recentlyChanged) {
    if (currentTimeoutId) {
      clearTimeout(currentTimeoutId);
    }
    currentTimeoutId = setTimeout(() => {
      setThemeTimeoutCallback(theme);
      currentTimeoutId = null;
    }, 300);
  }
  else {
    setThemeTimeoutCallback(theme);
  }
};

// Updates the theme of the website.
const setThemeTimeoutCallback = (theme) => {
  document.documentElement.setAttribute("data-theme", theme)
  localStorage.theme = theme;
  recentlyChanged = true;
}

// Updates the UI of the theme picker, but doesn't update the theme itself.
// We will update the theme a short time later through `setThemeTimeoutCallback()`, 
// after we determined the user settled on a theme they want.
updateThemePickerSelection = (theme) => {
  let radio;
  switch (theme) {
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

initializeEventListeners();
// The concern described in `onThemeRadioChecked()`
// doesn't apply when setting the theme on webpage load.
// So no need to set the delay parameter here.
setTheme(localStorage.theme);