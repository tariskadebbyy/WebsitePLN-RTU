document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = document.getElementById('username').value.trim();
      const pass = document.getElementById('password').value.trim();

      // Cek kredensial sederhana
      if (
        (user === 'admin' && pass === 'Admin123?') ||
        (user === 'user' && pass === 'user')
      ) {
        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('username', user);
        window.location.href = 'dashboard.html';
      } else {
        const notif = document.getElementById('notif');
        if (notif) {
          notif.textContent = 'Username atau password salah';
          notif.style.display = 'block';
          notif.style.color = 'red';
        } else {
          alert('Username atau password salah');
        }
      }
    });
  }

  // === TOGGLE PASSWORD VISIBILITY ===
  const toggle = document.querySelector('.toggle-password');
  const pwd = document.getElementById('password');

  if (toggle && pwd) {
    toggle.addEventListener('click', () => {
      const icon = toggle.querySelector('i');

      if (pwd.type === 'password') {
        pwd.type = 'text';
        if (icon) {
          icon.classList.remove('fa-eye');
          icon.classList.add('fa-eye-slash');
        }
      } else {
        pwd.type = 'password';
        if (icon) {
          icon.classList.remove('fa-eye-slash');
          icon.classList.add('fa-eye');
        }
      }
    });
  }
});
