const select = document.getElementById("theme-select");

const Themes = Object.freeze({
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "",
});

const setTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.theme = theme;
  select.value = theme;
};

select.onchange = (e) => setTheme(e.target.value);
if ("theme" in localStorage) setTheme(localStorage.theme);
