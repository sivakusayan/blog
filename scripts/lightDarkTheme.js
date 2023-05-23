const Themes = Object.freeze({
  LIGHT: "LIGHT",
  DARK: "DARK",
  SYSTEM: "SYSTEM",
});

const initializeThemeRadios = () => {
  const lightThemeRadio = document.getElementById("light-theme-radio");
  const darkThemeRadio = document.getElementById("dark-theme-radio");
  const systemThemeRadio = document.getElementById("system-theme-radio");

  lightThemeRadio.onchange = () => setTheme(Themes.LIGHT);
  darkThemeRadio.onchange = () => setTheme(Themes.DARK);
  systemThemeRadio.onchange = () => setTheme(Themes.SYSTEM);

  // Decide what radio should start off checked.
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
  radio.checked = true;
};

const setTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme)
  localStorage.theme = theme;
};

initializeThemeRadios();