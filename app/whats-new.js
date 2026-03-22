document.getElementById('continue').onclick = (e) => {
  __TAURI__.window.getCurrentWindow().close();
};
