document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('backBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      if (document.referrer) {
        window.history.back();
      } else {
        window.location.href = 'index.html';
      }
    });
  }
});
