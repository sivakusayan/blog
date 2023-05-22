const Themes = Object.freeze({
  LIGHT: "LIGHT",
  DARK: "DARK",
  SYSTEM: "SYSTEM",
});

const initializeTheme = () => {
  let radio;
  switch (localStorage.theme) {
    case Themes.LIGHT:
      radio = document.getElementById("light-theme-radio");
      break;
    case Themes.DARK:
      radio = document.getElementById("dark-theme-radio");
      break;
    case Themes.SYSTEM:
      radio = document.getElementById("system-theme-radio");
      break;
    default:
      break;
  }

  radio.checked = true;
  radio.dispatchEvent(new Event('change'));
}

const setupThemeRadios = () => {
  const lightThemeRadio = document.getElementById("light-theme-radio");
  const darkThemeRadio = document.getElementById("dark-theme-radio");
  const systemThemeRadio = document.getElementById("system-theme-radio");

  lightThemeRadio.onchange = () => setTheme(Themes.LIGHT);
  darkThemeRadio.onchange = () => setTheme(Themes.DARK);
  systemThemeRadio.onchange = () => setTheme(Themes.SYSTEM);
};

const setTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme)
  localStorage.theme = theme;
};

setupThemeRadios();
initializeTheme();