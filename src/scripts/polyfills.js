//Extremely crude polyfill for :has selector, specifically for details elements.
const summaryElements = document.querySelectorAll("summary");
summaryElements.forEach((summary) => {
    const details = summary.parentElement;
    summary.onmouseover = () => {
        details.classList.add("hover");
    }
    summary.onmouseleave = () => {
        details.classList.remove("hover");
    }

    summary.onfocus = () => {
        details.classList.add("focus");
    }
    summary.onblur = () => {
        details.classList.remove("focus");
    }
});