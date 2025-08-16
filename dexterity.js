document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('startDrillBtn')?.addEventListener('click', () => {
    const select = document.getElementById('drillSelect');
    if (select && select.value) {
      window.location.href = select.value;
    }
  });
});
