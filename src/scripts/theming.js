const select = document.getElementById("theme-select");

const Themes = Object.freeze({
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "",
});

const setTheme = (theme) => {
  if (!theme) return;
  
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.theme = theme;
  select.value = theme;
};

select.onchange = (e) => setTheme(e.target.value);
setTheme(localStorage.theme);
