document.documentElement.classList.remove("script-disabled")

// Browsers don't currently seem to make overflow elements focusable
// by default. So let's do it ourselves, so keyboard users
// can scroll code blocks.
const codeElements = document.querySelectorAll("pre");
for (const code of codeElements) {
    if (code.scrollWidth > code.clientWidth) {
        code.tabIndex = 0;
    }
}
