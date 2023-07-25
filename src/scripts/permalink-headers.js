const headers = document
  .querySelector("main")
  .querySelectorAll("h2,h3,h4,h5,h6");
console.log(headers);
let lastActiveNotification = null;
let lastActiveTimeout = null;

headers.forEach((header) => {
  const liveRegion = document.createElement("div");
  liveRegion.id = header.id + "-live";
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.className = "copy-notification-container";

  header.after(liveRegion);
  const link = header.querySelector("a");

  link.onclick = () => {
    const url = link.href;
    navigator.clipboard.writeText(url);

    if (lastActiveNotification) {
      lastActiveNotification.innerHTML = "";
      clearTimeout(lastActiveTimeout);
    }
    liveRegion.innerHTML = "&#10003; Copied permalink to clipboard";
    lastActiveNotification = liveRegion;
    lastActiveTimeout = setTimeout(() => {
      liveRegion.innerHTML = "";
    }, 5000);
  };
});
