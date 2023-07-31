// These animations make me happy :)
const details = document.querySelectorAll('details');
details.forEach((detail) => {
    const summary = detail.querySelector('summary');
    detail.style.height = `${summary.offsetHeight}px`;
    detailBorderWidthTotal = parseFloat(getComputedStyle(detail).borderWidth)*2;

    detail.addEventListener('toggle', () => {
        if (detail.open) {
            let totalChildrenHeight = 0;
            for (let i = 0; i < detail.children.length; i++) {
                const style = getComputedStyle(detail.children[i]);
                totalChildrenHeight += parseFloat(style.marginTop) + parseFloat(style.marginBottom) + parseFloat(style.height);
            }
            detail.style.height = `${totalChildrenHeight + detailBorderWidthTotal}px`;
        } else {
            detail.style.height = `${summary.offsetHeight}px`;
        }
    });

    window.addEventListener("resize", () => {
        if (detail.open) {
            let totalChildrenHeight = 0;
            for (let i = 0; i < detail.children.length; i++) {
                const style = getComputedStyle(detail.children[i]);
                totalChildrenHeight += parseFloat(style.marginTop) + parseFloat(style.marginBottom) + parseFloat(style.height);
            }
            detail.style.height = `${totalChildrenHeight + detailBorderWidthTotal}px`;
        }
    });
});