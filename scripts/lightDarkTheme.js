const Themes = Object.freeze({
  LIGHT: "LIGHT",
  DARK: "DARK",
  SYSTEM: "SYSTEM",
});

const setupThemeRadios = () => {
  const lightThemeRadio = document.getElementById("light-theme-radio");
  const darkThemeRadio = document.getElementById("dark-theme-radio");
  const systemThemeRadio = document.getElementById("system-theme-radio");

  lightThemeRadio.onchange = () => setTheme(Themes.LIGHT);
  darkThemeRadio.onchange = () => setTheme(Themes.DARK);
  systemThemeRadio.onchange = () => setTheme(Themes.SYSTEM);
};

const setTheme = (theme) => {
  switch (theme) {
    case Themes.LIGHT:
      document.body.className = "light-theme";
      break;
    case Themes.DARK:
      document.body.className = "dark-theme";
      break;
    case Themes.SYSTEM:
      document.body.className = "";
      break;
    default:
      break;
  }
};

setupThemeRadios();
