document.addEventListener("DOMContentLoaded", () => {
  const collapseEl = document.querySelector("#navbarCollapse");
  const navLinks = collapseEl ? collapseEl.querySelectorAll(".nav-link") : [];

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const collapseInstance = collapseEl ? bootstrap.Collapse.getInstance(collapseEl) : null;
      if (collapseInstance && window.innerWidth < 992) {
        collapseInstance.hide();
      }
    });
  });
});
