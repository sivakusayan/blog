const lightThemeButton = document.getElementById('light-theme-button');
const darkThemeButton = document.getElementById('dark-theme-button');
const systemThemeButton = document.getElementById('system-theme-button');
let currentToggledButton = systemThemeButton;

const Themes = Object.freeze({
	LIGHT: 'LIGHT',
	DARK: 'DARK',
	SYSTEM: 'SYSTEM',
});

const setTheme = (theme) => {
	const root = document.documentElement;
	if (root.getAttribute('data-theme') === theme) return;

	root.setAttribute('data-theme', theme);
	localStorage.theme = theme;
	updatePressedThemeButton(theme);

	root.dispatchEvent(new Event('theme-changed'));
};

// Update our list of theme buttons so that the correct one
// has the 'pressed' state.
const updatePressedThemeButton = (theme) => {
	if (currentToggledButton) {
		currentToggledButton.setAttribute('aria-pressed', 'false');
	}
	switch (theme) {
		case Themes.LIGHT:
			currentToggledButton = lightThemeButton;
			break;
		case Themes.DARK:
			currentToggledButton = darkThemeButton;
			break;
		case Themes.SYSTEM:
			currentToggledButton = systemThemeButton;
			break;
		default:
			break;
	}
	currentToggledButton.setAttribute('aria-pressed', 'true');
};

// Since we are currently adjusting line-height and margin based on the theme,
// we need to adjust the scroll position after the theme is changed.
const onThemeButtonClick = (e, theme) => {
	const { top } = e.currentTarget.getBoundingClientRect();
	setTheme(theme);
	const { top: newTop } = e.currentTarget.getBoundingClientRect();
	window.scrollBy({
		top: newTop - top,
		behavior: 'instant',
	});
};

const isDarkMode = () => {
	const root = document.documentElement;
	if (root.getAttribute('data-theme') === Themes.DARK) {
		return true;
	}
	if (
		root.getAttribute('data-theme') === Themes.SYSTEM &&
		window.matchMedia &&
		window.matchMedia('(prefers-color-scheme: dark)').matches
	) {
		return true;
	}
	return false;
};

lightThemeButton.onclick = (e) => onThemeButtonClick(e, Themes.LIGHT);
darkThemeButton.onclick = (e) => onThemeButtonClick(e, Themes.DARK);
systemThemeButton.onclick = (e) => onThemeButtonClick(e, Themes.SYSTEM);

// We don't need to restore the theme here when the page loads.
// We load it at the end of the <head> tag to prevent FOUS.
if ('theme' in localStorage) updatePressedThemeButton(localStorage.theme);
