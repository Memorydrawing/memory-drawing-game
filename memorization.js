document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.exercise-item[data-link]').forEach(item => {
    item.addEventListener('click', () => {
      window.location.href = item.dataset.link;
    });
  });
});
