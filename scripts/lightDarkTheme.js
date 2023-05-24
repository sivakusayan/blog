const lightThemeRadio = document.getElementById("light-theme-radio");
const darkThemeRadio = document.getElementById("dark-theme-radio");
const systemThemeRadio = document.getElementById("system-theme-radio");
let currentCheckedRadio = null;
let currentTimeoutId = null;
let selectionFromKeyboard = false;

const Themes = Object.freeze({
  LIGHT: "LIGHT",
  DARK: "DARK",
  SYSTEM: "SYSTEM",
});

const initializeEventListeners = () => {
  lightThemeRadio.onchange = (e) => onThemeRadioChecked(Themes.LIGHT);
  darkThemeRadio.onchange = (e) => onThemeRadioChecked(Themes.DARK);
  systemThemeRadio.onchange = (e) => onThemeRadioChecked(Themes.SYSTEM);

  // Set this flag so we know if the theme change should be delayed or not.
  // See `onThemeRadioChecked()` for why we need to do this.
  // Assistive tech interactions should register as clicks if they
  // use the standard APIs, so they likely won't go through here.
  // Regardless, it seems like we only need delay for the keyboard anyway.
  document.getElementById("theme-picker").onkeydown = (e) => {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp":
      case "ArrowLeft":
      case "ArrowRight":
        selectionFromKeyboard = true;
        break;
      default:
        break;
    }
  };
};

const onThemeRadioChecked = (theme) => {
  // Only set theme on a timeout so if a user quickly arrows through
  // the theme picker the theme switch isn't jarring and flashing 
  // in their face.
  if (selectionFromKeyboard) {
    setTheme(theme, 500);
  }
  else {
    setTheme(theme);
  }

  // Clear flag for the next time round
  selectionFromKeyboard = false;
}

const setTheme = (theme, delay) => {
  updateThemePickerSelection(theme)
  if (delay) {
    if (currentTimeoutId) {
      clearTimeout(currentTimeoutId);
    }
    currentTimeoutId = setTimeout(() => setThemeTimeoutCallback(theme), 300);
  }
  else {
    setThemeTimeoutCallback(theme)
  }
};

// Updates the theme of the website.
const setThemeTimeoutCallback = (theme) => {
  document.documentElement.setAttribute("data-theme", theme)
  localStorage.theme = theme;
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