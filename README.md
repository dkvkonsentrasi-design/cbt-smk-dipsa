# CBT SMK DIPSA — Versi Gratis & Online

Paket sederhana:
- HTML
- CSS
- JavaScript
- Firebase Authentication
- Firebase Firestore
- GitHub Pages

## 1. Buat project Firebase

Buka Firebase Console:
https://console.firebase.google.com/

Buat project baru.

## 2. Aktifkan Authentication

Firebase Console:
Authentication -> Sign-in method -> Email/Password -> Enable.

Lalu buat akun siswa/guru di:
Authentication -> Users -> Add user.

Contoh:
- siswa1@contoh.com
- guru@contoh.com

## 3. Aktifkan Firestore

Firebase Console:
Firestore Database -> Create database.

Untuk percobaan awal, pilih mode yang sesuai kebutuhan proyek Anda.

## 4. Tambahkan Web App

Firebase Console:
Project settings -> General -> Your apps -> Web -> Register app.

Firebase akan memberikan konfigurasi seperti:

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

Salin nilai tersebut ke `firebase-config.js`.

## 5. Atur Firestore Rules

Untuk tahap belajar/testing, Anda dapat membuat rules yang mengizinkan user yang login menulis hasil.

Contoh rules dasar:

rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    match /hasil_ujian/{document} {
      allow create: if request.auth != null;
      allow read: if request.auth != null;
    }
  }
}

Untuk website sekolah yang dipakai sungguhan, rules perlu diperketat agar siswa tidak bisa membaca atau mengubah data yang bukan miliknya.

## 6. Jalankan

Karena menggunakan Firebase module dari CDN, project ini dapat digunakan pada hosting HTTPS seperti GitHub Pages.

Jangan membuka `index.html` dengan `file://` jika browser memblokir module. Gunakan GitHub Pages atau server lokal.

## 7. Upload ke GitHub Pages

1. Buat repository baru di GitHub.
2. Upload:
   - index.html
   - style.css
   - app.js
   - questions.js
   - firebase-config.js
3. Masuk Settings -> Pages.
4. Source: Deploy from a branch.
5. Pilih branch `main`, folder `/root`.
6. Simpan.
7. Tunggu GitHub Pages membuat alamat website.

## Catatan penting

`firebase-config.js` bukan tempat menyimpan password admin. Firebase Web config memang digunakan di aplikasi web. Keamanan database dilakukan melalui Authentication dan Firestore Security Rules.

Untuk versi produksi sekolah, sebaiknya ditambahkan:
- dashboard guru
- role siswa/guru
- bank soal dari Firestore
- batas satu kali ujian
- pengacakan soal
- pengacakan pilihan
- export Excel
- riwayat nilai
- proteksi agar siswa tidak melihat data siswa lain
