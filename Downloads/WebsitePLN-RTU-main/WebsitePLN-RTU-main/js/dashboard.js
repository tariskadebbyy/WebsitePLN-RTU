// ===============================
// CEK STATUS LOGIN
// ===============================
if (localStorage.getItem("loggedIn") !== "true") {
  window.location.href = "index.html";
}

// ===============================
// FUNGSI LOGOUT
// ===============================
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", function (e) {
    e.preventDefault();
    const confirmLogout = confirm("Apakah Anda yakin ingin logout?");
    if (confirmLogout) {
      localStorage.removeItem("loggedIn");
      sessionStorage.clear();
      window.location.href = "index.html";
    }
  });
}

// ===============================
// KONFIGURASI GOOGLE SHEETS (CSV PUBLIC)
// ===============================
const SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTkV55boNedcPU8QjzEw9MsHnU-MkNlBztwDtTENdwFRym-hGDXOkm8zGJvC6XzNbPKujnwH8LzIIlE/pub?output=csv";

// ===============================
// INISIALISASI PETA LEAFLET
// ===============================
const map = L.map("map", {
  minZoom: 7,
  maxBounds: [[-9.5, 110], [-6.5, 115]],
}).setView([-7.5, 112], 7);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap",
}).addTo(map);

let allData = [];
let markers = [];
let filteredMarkers = [];
let controlRouting;
let userMarker;
let targetMarker;
let watchId;
let selectedTarget = null;
let currentInstructionIndex = 0;
let currentInstructions = [];

// ===============================
// ELEMEN NOTIFIKASI INSTRUKSI
// ===============================
const instrBox = document.createElement("div");
instrBox.id = "navInstruction";
instrBox.style.cssText =
  "background:#fff;padding:10px 14px;border-radius:10px;position:absolute;top:75px;left:20px;z-index:9999;box-shadow:0 2px 6px rgba(0,0,0,0.2);font-weight:600;display:none;";
instrBox.textContent = "Instruksi navigasi akan muncul di sini...";
document.body.appendChild(instrBox);

// ===============================
// FUNGSI SUARA ARAH (Text-to-Speech)
// ===============================
function speak(text) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "id-ID";
  msg.rate = 1.05;
  speechSynthesis.speak(msg);
}

// ===============================
// AMBIL DATA DARI GOOGLE SHEETS
// ===============================
fetch(SHEET_CSV)
  .then((res) => res.text())
  .then((csv) => {
    const rows = csv.trim().split("\n").map((r) => r.split(","));
    if (!rows || rows.length < 2) {
      document.getElementById("rtuTableBody").innerHTML =
        '<tr><td colspan="6" class="text-center">Data kosong</td></tr>';
      return;
    }

    const IDX_UP3 = 3,
      IDX_ULP = 4,
      IDX_GI = 5,
      IDX_PENYULANG = 6,
      IDX_NAMA_KP = 13,
      IDX_KET_KP = 20,
      IDX_MERK_RTU = 23,
      IDX_LAT = 24,
      IDX_LNG = 25,
      IDX_MODEM = 28,
      IDX_KARTU = 31,
      IDX_BATERAI = 32;

    const giSet = new Set(),
      penyulangSet = new Set(),
      rtuSet = new Set(),
      up3Set = new Set(),
      ulpMap = new Map(),
      giMap = new Map();

    rows.slice(1).forEach((row) => {
      const item = {
        up3: row[IDX_UP3] || "",
        ulp: row[IDX_ULP] || "",
        gi: row[IDX_GI] || "",
        penyulang: row[IDX_PENYULANG] || "",
        nama: row[IDX_NAMA_KP] || "",
        ket: row[IDX_KET_KP] || "",
        merk: row[IDX_MERK_RTU] || "",
        modem: row[IDX_MODEM] || "-",
        kartu: row[IDX_KARTU] || "-",
        bat: row[IDX_BATERAI] || "-",
        lat: parseFloat(row[IDX_LAT]),
        lng: parseFloat(row[IDX_LNG]),
      };

      if (isNaN(item.lat) || isNaN(item.lng)) return;
      if (item.lat < -9.5 || item.lat > -6.5 || item.lng < 110 || item.lng > 115) return;

      allData.push(item);
      giSet.add(item.gi);
      penyulangSet.add(item.penyulang);
      rtuSet.add(item.nama);
      up3Set.add(item.up3);

      if (!ulpMap.has(item.up3)) ulpMap.set(item.up3, new Set());
      ulpMap.get(item.up3).add(item.ulp);

      if (!giMap.has(item.ulp)) giMap.set(item.ulp, new Set());
      giMap.get(item.ulp).add(item.gi);

      const marker = L.marker([item.lat, item.lng]).bindPopup(`
        <b>${item.nama}</b><br>
        UP3: ${item.up3}<br>ULP: ${item.ulp}<br>GI: ${item.gi}<br>Penyulang: ${item.penyulang}<br>
        <b>Keterangan:</b> ${item.ket}<br>
        Merk RTU: ${item.merk}<br>
        Modem: ${item.modem}<br>Kartu: ${item.kartu}<br>Baterai: ${item.bat}<br>
        <b>Koordinat:</b> ${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}
      `);
      marker._data = item;
      marker.addTo(map);
      markers.push(marker);
    });

    document.getElementById("gi-count").textContent = giSet.size;
    document.getElementById("penyulang-count").textContent = penyulangSet.size;
    document.getElementById("rtu-count").textContent = rtuSet.size;

    const up3Sel = document.getElementById("up3Filter");
    const ulpSel = document.getElementById("ulpFilter");
    const giSel = document.getElementById("giFilter");

    [...up3Set].sort().forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      up3Sel.appendChild(o);
    });

    up3Sel.addEventListener("change", () => {
      ulpSel.innerHTML = '<option value="">Pilih ULP</option>';
      giSel.innerHTML = '<option value="">Pilih GI</option>';
      giSel.disabled = true;
      const up3 = up3Sel.value;
      ulpSel.disabled = !up3;
      if (!up3 || !ulpMap.has(up3)) return;
      [...ulpMap.get(up3)].sort().forEach((v) => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = v;
        ulpSel.appendChild(o);
      });
      updateDisplay();
    });

    ulpSel.addEventListener("change", () => {
      giSel.innerHTML = '<option value="">Pilih GI</option>';
      const ulp = ulpSel.value;
      giSel.disabled = !ulp;
      if (!ulp || !giMap.has(ulp)) return;
      [...giMap.get(ulp)].sort().forEach((v) => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = v;
        giSel.appendChild(o);
      });
      updateDisplay();
    });

    giSel.addEventListener("change", updateDisplay);

    function updateDisplay() {
      const up3 = up3Sel.value;
      const ulp = ulpSel.value;
      const gi = giSel.value;

      filteredMarkers = markers.filter((m) => {
        const d = m._data;
        return (
          (!up3 || d.up3 === up3) &&
          (!ulp || d.ulp === ulp) &&
          (!gi || d.gi === gi)
        );
      });

      updateTable(
        allData.filter(
          (d) =>
            (!up3 || d.up3 === up3) &&
            (!ulp || d.ulp === ulp) &&
            (!gi || d.gi === gi)
        )
      );

      map.eachLayer((l) => {
        if (l instanceof L.Marker && !l._url) map.removeLayer(l);
      });
      filteredMarkers.forEach((m) => m.addTo(map));

      if (filteredMarkers.length) {
        map.fitBounds(L.featureGroup(filteredMarkers).getBounds());
      }
    }

    updateTable(allData);
  });

// ===============================
// UPDATE TABEL DAN PILIH KP
// ===============================
function updateTable(dataList) {
  const tbody = document.getElementById("rtuTableBody");
  tbody.innerHTML = "";

  if (!dataList.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">Tidak ada data</td></tr>';
    return;
  }

  dataList.forEach((d) => {
    const tr = document.createElement("tr");

    const ketValue = (d.ket || "").toLowerCase().trim();
    let ketStyle = "";
    if (ketValue.includes("integrasi") && !ketValue.includes("belum"))
      ketStyle = 'style="background:#28a745;color:white;font-weight:600"';
    else if (ketValue.includes("belum"))
      ketStyle = 'style="background:#ffc107;color:black;font-weight:600"';

    tr.innerHTML = `
      <td>${d.merk || "-"}</td>
      <td>${d.nama || "-"}</td>
      <td ${ketStyle}>${d.ket || "-"}</td>
      <td>${d.modem || "-"}</td>
      <td>${d.kartu || "-"}</td>
      <td>${d.bat || "-"}</td>
    `;

    tr.addEventListener("click", () => {
      document.querySelectorAll("#rtuTableBody tr").forEach((r) =>
        r.classList.remove("table-active")
      );
      tr.classList.add("table-active");

      selectedTarget = L.latLng(d.lat, d.lng);

      if (targetMarker) map.removeLayer(targetMarker);
      targetMarker = L.marker(selectedTarget, {
        icon: L.icon({
          iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
          iconSize: [38, 38],
        }),
      })
        .addTo(map)
        .bindPopup(`<b>${d.nama}</b>`)
        .openPopup();

      map.flyTo(selectedTarget, 15, { duration: 1.5 });
    });

    tbody.appendChild(tr);
  });
}

// ===============================
// FUNGSI REFRESH DATA OTOMATIS DARI SPREADSHEET
// ===============================
function refreshData() {
  console.log("🔄 Memperbarui data dashboard otomatis...");

  fetch(SHEET_CSV)
    .then((res) => res.text())
    .then((csv) => {
      const rows = csv.trim().split("\n").map((r) => r.split(","));
      if (!rows || rows.length < 2) return;

      const giSet = new Set();
      const penyulangSet = new Set();
      const rtuSet = new Set();

      rows.slice(1).forEach((row) => {
        const gi = row[5]?.trim();
        const penyulang = row[6]?.trim();
        const namaKP = row[13]?.trim();

        if (gi) giSet.add(gi);
        if (penyulang) penyulangSet.add(penyulang);
        if (namaKP) rtuSet.add(namaKP);
      });

      document.getElementById("gi-count").textContent = giSet.size;
      document.getElementById("penyulang-count").textContent = penyulangSet.size;
      document.getElementById("rtu-count").textContent = rtuSet.size;

      console.log("✅ Data dashboard berhasil diperbarui otomatis.");
    })
    .catch((err) => console.error("Gagal memperbarui data:", err));
}

// Jalankan pertama kali setelah load
refreshData();

// Jalankan otomatis setiap 5 menit (300.000 ms)
setInterval(refreshData, 300000);

// ===============================
// FITUR RUTE OTOMATIS + INSTRUKSI (VERSI DIBENAHI)
// ===============================
document.getElementById("btnRute").addEventListener("click", () => {
  const target = selectedTarget;
  if (!target) return alert("Silakan pilih salah satu KP dari tabel dulu.");

  if (!navigator.geolocation)
    return alert("Browser tidak mendukung geolocation.");

  // === Jika sudah aktif, hentikan tracking ===
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    if (controlRouting) {
      map.removeControl(controlRouting);
      controlRouting = null;
    }
    instrBox.style.display = "none";
    alert("Tracking dihentikan. Silakan pilih KP baru untuk memulai rute lagi.");
    return;
  }

  alert("Mulai pelacakan posisi Anda secara real-time...");

  let lastInstruction = "";
  let routeBuilt = false;

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const userPos = L.latLng(pos.coords.latitude, pos.coords.longitude);

      // Update posisi marker pengguna
      if (!userMarker) {
        userMarker = L.marker(userPos, {
          icon: L.icon({
            iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
            iconSize: [35, 35],
          }),
        }).addTo(map).bindPopup("Posisi Anda");
      } else {
        userMarker.setLatLng(userPos);
      }

      // === Bangun rute hanya SEKALI di awal ===
      if (!routeBuilt) {
        routeBuilt = true;

        controlRouting = L.Routing.control({
          waypoints: [userPos, target],
          routeWhileDragging: false,
          addWaypoints: false,
          draggableWaypoints: false,
          fitSelectedRoutes: true,
          lineOptions: { styles: [{ color: "blue", weight: 4 }] },
        })
          .on("routesfound", function (e) {
            const route = e.routes[0];
            currentInstructions = route.instructions;
            currentInstructionIndex = 0;
            if (currentInstructions.length > 0) {
              const first = currentInstructions[0].text;
              instrBox.style.display = "block";
              instrBox.textContent = first;
              speak(first);
              lastInstruction = first;
            }
          })
          .addTo(map);

        return; // keluar agar tidak lanjut ke bawah sebelum rute ada
      }

      // === Jika sudah ada rute, cek jarak ke instruksi berikutnya ===
      if (currentInstructions.length > 0 && currentInstructionIndex < currentInstructions.length) {
        const nextInstr = currentInstructions[currentInstructionIndex];
        const instrLatLng = L.latLng(nextInstr.latLng.lat, nextInstr.latLng.lng);

        // Jika jarak ke titik instruksi < 30m → lanjut ke berikutnya
        if (userPos.distanceTo(instrLatLng) < 30) {
          currentInstructionIndex++;
          if (currentInstructionIndex < currentInstructions.length) {
            const nextText = currentInstructions[currentInstructionIndex].text;
            if (nextText !== lastInstruction) {
              instrBox.textContent = nextText;
              speak(nextText);
              lastInstruction = nextText;
            }
          } else {
            instrBox.textContent = "Anda telah tiba di lokasi tujuan.";
            speak("Anda telah tiba di lokasi tujuan.");
          }
        }
      }
    },
    (err) => {
      alert("Gagal mendapatkan lokasi: " + (err.message || err.code));
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
  );
});
