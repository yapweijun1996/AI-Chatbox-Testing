/**
 * Mouse-following tooltip engine for any element carrying a [data-tooltip] attribute.
 */

function initTooltips() {
  const tooltipEl = document.createElement("div");
  tooltipEl.id = "global-tooltip";
  tooltipEl.className = "custom-tooltip";
  document.body.appendChild(tooltipEl);

  document.body.addEventListener("mouseover", (e) => {
    const target = e.target.closest("[data-tooltip]");
    if (target) {
      tooltipEl.textContent = target.getAttribute("data-tooltip");
      tooltipEl.style.display = "block";
      setTimeout(() => tooltipEl.classList.add("visible"), 10);
    }
  });

  document.body.addEventListener("mousemove", (e) => {
    if (tooltipEl.style.display === "block") {
      const offsetX = 12, offsetY = 12;
      let left = e.pageX + offsetX, top = e.pageY + offsetY;
      const tooltipRect = tooltipEl.getBoundingClientRect();
      if (left + tooltipRect.width > window.innerWidth) left = e.pageX - tooltipRect.width - offsetX;
      if (top + tooltipRect.height > window.innerHeight) top = e.pageY - tooltipRect.height - offsetY;
      tooltipEl.style.left = `${left}px`;
      tooltipEl.style.top = `${top}px`;
    }
  });

  document.body.addEventListener("mouseout", (e) => {
    const target = e.target.closest("[data-tooltip]");
    if (target) {
      tooltipEl.classList.remove("visible");
      tooltipEl.style.display = "none";
    }
  });
}
