import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';


// ====================================================================================
// 1. DEFINISI METRIK KUSTOM
// Metrik ini akan muncul di laporan akhir untuk analisis yang lebih detail.
// ====================================================================================
const responseTime = new Trend('response_time_ms');    // Mengukur durasi respons dalam milidetik.
const successRate = new Rate('success_rate');         // Mengukur persentase permintaan yang berhasil (status 200).
const errorRate = new Rate('error_rate');             // Mengukur persentase permintaan yang gagal.
const requestCounter = new Counter('total_requests'); // Menghitung total permintaan yang dikirim.


// ====================================================================================
// 2. PROFIL BEBAN PENGUJIAN (LOAD PROFILES)
// Kita menggunakan environment variable (LOAD_PROFILE) untuk memilih skenario beban.
// Ini sesuai dengan metodologi Anda untuk menguji pada beban rendah, sedang, dan tinggi.
// Contoh menjalankan: LOAD_PROFILE=medium k6 run test.js
// ====================================================================================
const loadProfile = __ENV.LOAD_PROFILE || 'low'; // Default ke 'low' jika tidak ditentukan

let testStages;
switch (loadProfile) {
  case 'low':
    testStages = [
      { duration: '15s', target: 50 },   // Pemanasan
      { duration: '30s', target: 100 },  // Naik ke beban puncak
      { duration: '1m', target: 100 },   // Tahan beban
      { duration: '10s', target: 0 },    // Pendinginan
    ];
    break;

  case 'medium':
    testStages = [
      { duration: '20s', target: 100 },  // Pemanasan
      { duration: '40s', target: 500 },  // Naik ke beban puncak
      { duration: '1m', target: 500 },   // Tahan beban
      { duration: '15s', target: 0 },    // Pendinginan
    ];
    break;

  case 'high':
    testStages = [
      { duration: '30s', target: 250 },   // Pemanasan
      { duration: '1m', target: 1000 },  // Naik ke beban puncak
      { duration: '1m', target: 1000 },  // Tahan beban
      { duration: '20s', target: 0 },    // Pendinginan
    ];
    break;
  
  default:
      // Jika profil tidak dikenali, jalankan profil rendah sebagai default
      console.log(`Unknown profile "${loadProfile}". Running LOW load profile.`);
      testStages = [
        { duration: '30s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 0 },
      ];
}


// ====================================================================================
// 3. OPSI PENGUJIAN
// Konfigurasi utama untuk pengujian, termasuk stages dan thresholds (kriteria lulus/gagal).
// ====================================================================================
export const options = {
  stages: testStages,
  discardResponseBodies: false, // Kita perlu body untuk validasi
  thresholds: {
    // Kriteria keberhasilan sesuai dengan Bab 4 Anda
    'http_req_duration': ['p(95)<200'], // 95% permintaan harus di bawah 200ms
    'success_rate': ['rate>=0.99'],     // Tingkat keberhasilan harus 99% atau lebih
    'error_rate': ['rate<0.01'],        // Tingkat kegagalan harus di bawah 1%
  },
};


// ====================================================================================
// 4. FUNGSI UTAMA PENGUJIAN
// Logika yang akan dijalankan oleh setiap Virtual User (VU) secara berulang.
// ====================================================================================
export default function () {
  // Ambil URL target dari environment variable. Ini membuat skrip bisa dipakai untuk
  // baseline-api dan redis-api tanpa mengubah kode.
  const targetURL = __ENV.TARGET_URL || 'http://localhost:3000/api/data';

  const res = http.get(targetURL);

  // Validasi respons
  const isSuccess = check(res, {
    'Status is 200 OK': (r) => r.status === 200,
  });

  // Catat metrik kustom berdasarkan hasil validasi
  responseTime.add(res.timings.duration);
  successRate.add(isSuccess);
  errorRate.add(!isSuccess);
  requestCounter.add(1);

  // Jeda 1 detik untuk mensimulasikan "think time" pengguna
  sleep(1);
}

// // ====================================================================================
// // 5. EKSPOR LAPORAN
// // Fungsi ini akan menangani pembuatan file laporan ringkasan.
// // ====================================================================================
// export function handleSummary(data) {
//     console.log('Finished executing tests. Summary report:');
    
//     // Menghasilkan ringkasan teks di konsol
//     console.log(textSummary(data, { indent: ' ', enableColors: true }));
    
//     // Mengembalikan objek yang akan disimpan K6 ke file JSON
//     return {
//         'summary.json': JSON.stringify(data, null, 2), // Laporan dalam format JSON yang rapi
//     };
// }