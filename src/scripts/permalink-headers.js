const headers = document
  .querySelector("main")
  .querySelectorAll("h2,h3,h4,h5,h6");
console.log(headers);
let lastActiveNotification = null;

headers.forEach((header) => {
  const liveRegion = document.createElement("div");
  liveRegion.id = header.id + "-live";
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.className = "copy-notification-container";

  header.after(liveRegion);

  header.onclick = () => {
    const url = header.querySelector("a").href;
    navigator.clipboard.writeText(url);

    if (lastActiveNotification) {
      lastActiveNotification.innerHTML = "";
    }
    liveRegion.innerHTML = "&#10003; Copied permalink to clipboard";
    lastActiveNotification = liveRegion;
    setTimeout(() => {
      liveRegion.innerHTML = "";
    }, 5000);
  };
});
