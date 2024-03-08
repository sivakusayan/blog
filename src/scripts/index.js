document.documentElement.classList.remove("script-disabled")

// Browsers don't currently seem to make overflow elements focusable
// by default. So let's do it ourselves, so keyboard users
// can scroll code blocks.
const codeElements = document.querySelectorAll("pre");
for (const code of codeElements) {
    if (code.scrollWidth > code.clientWidth) {
        code.tabIndex = 0;
        // As soon as it's focusable, we'll unfortunately need to give this
        // an accname since this element will otherwise have an overly verbose
        // accname of its contents, which will probably be many, MANY lines of
        // code.
        code.ariaLabel = "Code Snippet";
        code.setAttribute("role", "region");
    }
}
