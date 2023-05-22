const Themes = Object.freeze({
  LIGHT: "LIGHT",
  DARK: "DARK",
  DEFAULT: "DEFAULT",
});

const setupThemeButtons = () => {
  const lightThemeButton = document.getElementById("light-theme-button");
  const darkThemeButton = document.getElementById("dark-theme-button");
  const defaultThemeButton = document.getElementById("default-theme-button");

  lightThemeButton.onclick = () => setTheme(Themes.LIGHT);
  darkThemeButton.onclick = () => setTheme(Themes.DARK);
  defaultThemeButton.onclick = () => setTheme(Themes.DEFAULT);
};

const setTheme = (theme) => {
  switch (theme) {
    case Themes.LIGHT:
      document.body.className = "light-theme";
      break;
    case Themes.DARK:
      document.body.className = "dark-theme";
      break;
    case Themes.DEFAULT:
      document.body.className = "";
      break;
    default:
      break;
  }
};

setupThemeButtons();
