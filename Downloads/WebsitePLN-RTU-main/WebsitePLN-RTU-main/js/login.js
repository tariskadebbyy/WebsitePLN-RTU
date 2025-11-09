document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const notif = document.getElementById('notif');
  const toggle = document.querySelector('.toggle-password');
  const pwd = document.getElementById('password');

  const users = [
    { username: 'admin', password: btoa('Admin123?') },
    { username: 'user', password: btoa('user') }
  ];

  // =======================================
  // EVENT LOGIN FORM
  // =======================================
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();

      // Validasi input kosong
      if (!username || !password) {
        return showNotif('Username dan password harus diisi!');
      }

      // Cek kredensial user
      const validUser = users.find(
        (u) => u.username === username && u.password === btoa(password)
      );

      if (validUser) {
        sessionStorage.setItem('loggedIn', 'true');
        sessionStorage.setItem('username', username);

        showNotif('Login berhasil! Mengarahkan ke dashboard...');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 800);
      } else {
        showNotif('Username atau password salah!');
      }
    });
  }

  // =======================================
  // TOGGLE PASSWORD VISIBILITY
  // =======================================
  if (toggle && pwd) {
    toggle.addEventListener('click', () => {
      const icon = toggle.querySelector('i');
      const type = pwd.type === 'password' ? 'text' : 'password';
      pwd.type = type;

    });
  }

  // =======================================
  // FUNGSI NOTIFIKASI TANPA CSS
  // =======================================
  function showNotif(message) {
    if (notif) {
      notif.textContent = message;
      notif.style.display = 'block';
    } else {
      alert(message);
    }
  }
});
