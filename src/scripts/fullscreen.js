const fullscreenButton = document.getElementById("fullscreen-button");

fullscreenButton.onclick = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
    fullscreenButton.innerText = "Launch Fullscreen";
  } else {
    if (document.documentElement.requestFullscreen) {
      fullscreenButton.innerText = "Exit Fullscreen";
      document.documentElement.requestFullscreen();
    }
  }
};
