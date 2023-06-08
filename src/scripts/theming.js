const lightThemeButton = document.getElementById("light-theme-button");
const darkThemeButton = document.getElementById("dark-theme-button");
const systemThemeButton = document.getElementById("system-theme-button");

const Themes = Object.freeze({
  LIGHT: "LIGHT",
  DARK: "DARK",
  SYSTEM: "SYSTEM",
});

const setTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.theme = theme;
  select.value = theme;
};

lightThemeButton.onclick = (e) => setTheme(Themes.LIGHT);
darkThemeButton.onclick = (e) => setTheme(Themes.DARK);
systemThemeButton.onclick = (e) => setTheme(Themes.SYSTEM);
if ("theme" in localStorage) setTheme(localStorage.theme);
