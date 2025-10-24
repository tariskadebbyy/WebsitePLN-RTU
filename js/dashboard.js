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
// Ganti link ini dengan link sheet kamu (output=csv)
const SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTkV55boNedcPU8QjzEw9MsHnU-MkNlBztwDtTENdwFRym-hGDXOkm8zGJvC6XzNbPKujnwH8LzIIlE/pub?output=csv";

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

// ===============================
// AMBIL DATA DARI GOOGLE SHEETS (CSV)
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

    // Indeks kolom sesuai spreadsheet (urutannya sama seperti sebelumnya)
    const IDX_UP3 = 3;
    const IDX_ULP = 4;
    const IDX_GI = 5;
    const IDX_PENYULANG = 6;
    const IDX_NAMA_KP = 13;
    const IDX_KET_KP = 20;
    const IDX_MERK_RTU = 23;
    const IDX_LAT = 24;
    const IDX_LNG = 25;
    const IDX_MODEM = 28;
    const IDX_KARTU = 31;
    const IDX_BATERAI = 32;

    const giSet = new Set();
    const penyulangSet = new Set();
    const rtuSet = new Set();
    const up3Set = new Set();
    const ulpMap = new Map();
    const giMap = new Map();

    rows.slice(1).forEach((row) => {
      const up3 = row[IDX_UP3] || "";
      const ulp = row[IDX_ULP] || "";
      const gi = row[IDX_GI] || "";
      const penyulang = row[IDX_PENYULANG] || "";
      const nama = row[IDX_NAMA_KP] || "";
      const ket = row[IDX_KET_KP] || "";
      const merk = row[IDX_MERK_RTU] || "";
      const modem = row[IDX_MODEM] || "-";
      const kartu = row[IDX_KARTU] || "-";
      const bat = row[IDX_BATERAI] || "-";
      const lat = parseFloat(row[IDX_LAT]);
      const lng = parseFloat(row[IDX_LNG]);

      if (isNaN(lat) || isNaN(lng)) return;
      if (lat < -9.5 || lat > -6.5 || lng < 110 || lng > 115) return;

      if (gi) giSet.add(gi);
      if (penyulang) penyulangSet.add(penyulang);
      if (nama) rtuSet.add(nama);

      up3Set.add(up3);
      if (!ulpMap.has(up3)) ulpMap.set(up3, new Set());
      ulpMap.get(up3).add(ulp);

      if (!giMap.has(ulp)) giMap.set(ulp, new Set());
      giMap.get(ulp).add(gi);

      const item = {
        up3,
        ulp,
        gi,
        penyulang,
        nama,
        ket,
        merk,
        modem,
        kartu,
        bat,
        lat,
        lng,
      };
      allData.push(item);

      const marker = L.marker([lat, lng]).bindPopup(`
        <b>${nama}</b><br>
        UP3: ${up3}<br>ULP: ${ulp}<br>GI: ${gi}<br>Penyulang: ${penyulang}<br>
        <b>Keterangan:</b> ${ket}<br>
        Merk RTU: ${merk}<br>
        Jenis Modem: ${modem}<br>
        Jenis Kartu: ${kartu}<br>
        Jenis Baterai: ${bat}<br>
        <b>Koordinat:</b> ${lat.toFixed(5)}, ${lng.toFixed(5)}
      `);
      marker._data = item;
      markers.push(marker);
      marker.addTo(map);
    });

    // Jumlah unik
    document.getElementById("gi-count").textContent = giSet.size;
    document.getElementById("penyulang-count").textContent = penyulangSet.size;
    document.getElementById("rtu-count").textContent = rtuSet.size;

    // ===============================
    // FILTER UP3 - ULP - GI
    // ===============================
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

    // ===============================
    // UPDATE MARKER & TABEL
    // ===============================
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

    // ===============================
    // TAMPILKAN TABEL AWAL
    // ===============================
    updateTable(allData);
  })
  .catch((err) => {
    console.error("Gagal mengambil data:", err);
    document.getElementById("rtuTableBody").innerHTML =
      '<tr><td colspan="6" class="text-center">Gagal memuat data</td></tr>';
  });

// ===============================
// FUNGSI UPDATE TABEL + KLIK KE PETA
// ===============================
function updateTable(dataList) {
  const tbody = document.getElementById("rtuTableBody");
  tbody.innerHTML = "";
  if (!dataList.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">Tidak ada data ditemukan</td></tr>';
    return;
  }

  dataList.forEach((d) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.merk || "-"}</td>
      <td>${d.nama || "-"}</td>
      <td>${d.ket || "-"}</td>
      <td>${d.modem || "-"}</td>
      <td>${d.kartu || "-"}</td>
      <td>${d.bat || "-"}</td>
    `;

    tr.addEventListener("click", () => {
      const marker = markers.find(
        (m) =>
          m._data.nama?.trim().toLowerCase() ===
          d.nama?.trim().toLowerCase()
      );
      if (marker) {
        document
          .querySelectorAll("#rtuTableBody tr")
          .forEach((r) => r.classList.remove("table-active"));
        tr.classList.add("table-active");
        map.flyTo(marker.getLatLng(), 15, { duration: 1.5 });
        marker.openPopup();
      }
    });

    tbody.appendChild(tr);
  });
}

// ===============================
// FUNGSI TAMPILKAN RUTE
// ===============================
document.getElementById("btnRute").addEventListener("click", () => {
  if (!filteredMarkers.length)
    return alert("Pilih lokasi terlebih dahulu untuk menampilkan rute.");

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const start = L.latLng(pos.coords.latitude, pos.coords.longitude);
        const end = filteredMarkers[0].getLatLng();

        if (controlRouting) map.removeControl(controlRouting);

        controlRouting = L.Routing.control({
          waypoints: [start, end],
          routeWhileDragging: true,
          lineOptions: { styles: [{ color: "blue", weight: 4 }] },
        }).addTo(map);
      },
      (err) => {
        alert("Gagal mendapatkan lokasi: " + (err.message || err.code));
      }
    );
  } else {
    alert("Browser tidak mendukung geolocation.");
  }
});
