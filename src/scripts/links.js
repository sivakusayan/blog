/**
 * Javascript enhancement to give clicked links a different text underline.
 */

const links = Array.from(document.querySelectorAll("main a[href]:not(.back-to-top)")).filter(link=>{
    const parentTag = link.parentElement.tagName;
    return parentTag !== "H2" && parentTag !== "H3" && parentTag !== "H4";
});

links.map(link => {
    if (localStorage.getItem(link.href)) {
        link.classList.add("visited");
    }
    link.addEventListener("click", () => {
        if (!link.classList.contains("visited")) {
            link.classList.add("visited");
            localStorage.setItem(link.href, "1");
        }
    });
});
