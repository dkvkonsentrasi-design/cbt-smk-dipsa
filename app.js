import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import firebaseConfig from "./firebase-config.js";
import { questions } from "./questions.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginCard = document.getElementById("loginCard");
const cbtCard = document.getElementById("cbtCard");
const resultCard = document.getElementById("resultCard");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const questionBox = document.getElementById("questionBox");
const questionNumber = document.getElementById("questionNumber");
const answeredCount = document.getElementById("answeredCount");
const timerEl = document.getElementById("timer");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const resultEl = document.getElementById("result");

let currentQuestion = 0;
let answers = Array(questions.length).fill(null);
let secondsLeft = 30 * 60;
let timerInterval = null;
let submitting = false;

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMessage.textContent = "Memproses login...";

  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById("email").value.trim(),
      document.getElementById("password").value
    );
    loginMessage.textContent = "";
  } catch (error) {
    loginMessage.textContent = "Login gagal: " + error.message;
  }
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      if (userData.role === "guru") {
  loginCard.classList.add("hidden");
  cbtCard.classList.add("hidden");
  resultCard.classList.remove("hidden");

  resultEl.innerHTML = `
    <div class="result-box">
      <h2>Dashboard Guru</h2>
      <p>Selamat datang, ${escapeHtml(user.email)}</p>
      <p>Akun Anda terdeteksi sebagai <strong>Guru</strong>.</p>
      <p>Memuat hasil ujian siswa...</p>
    </div>
  `;

  try {
    const resultsHtml = await loadExamResults();

    resultEl.innerHTML = `
      <div class="result-box">
        <h2>Dashboard Guru</h2>
        <p>Selamat datang, ${escapeHtml(user.email)}</p>
        ${resultsHtml}
      </div>
    `;
  } catch (error) {
    console.error("Gagal mengambil hasil ujian:", error);

    resultEl.innerHTML = `
      <div class="result-box">
        <h2>Dashboard Guru</h2>
        <p>Selamat datang, ${escapeHtml(user.email)}</p>
        <p>Gagal mengambil hasil ujian.</p>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }

  return;
}

      loginCard.classList.add("hidden");
      resultCard.classList.add("hidden");
      cbtCard.classList.remove("hidden");
      userInfo.textContent = `Peserta: ${user.email}`;
      startExam();

    } catch (error) {
      console.error("Gagal membaca role pengguna:", error);
      loginMessage.textContent =
        "Gagal membaca data pengguna: " + error.message;
    }
  } else {
    cbtCard.classList.add("hidden");
    resultCard.classList.add("hidden");
    loginCard.classList.remove("hidden");
    stopTimer();
  }
});

function startExam() {
  currentQuestion = 0;
  answers = Array(questions.length).fill(null);
  secondsLeft = 30 * 60;
  submitting = false;
  renderQuestion();
  updateTimer();
  stopTimer();
  timerInterval = setInterval(() => {
    secondsLeft--;
    updateTimer();

    if (secondsLeft <= 0) {
      stopTimer();
      submitExam(true);
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimer() {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  timerEl.textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderQuestion() {
  const q = questions[currentQuestion];

  questionNumber.textContent =
    `Soal ${currentQuestion + 1} dari ${questions.length}`;

  answeredCount.textContent =
    `Terjawab: ${answers.filter(a => a !== null).length}`;

  questionBox.innerHTML = `
    <div class="question">${currentQuestion + 1}. ${escapeHtml(q.question)}</div>
    ${q.options.map((option, index) => `
      <label class="option">
        <input type="radio" name="answer" value="${index}"
          ${answers[currentQuestion] === index ? "checked" : ""}>
        ${String.fromCharCode(65 + index)}. ${escapeHtml(option)}
      </label>
    `).join("")}
  `;

  document.querySelectorAll('input[name="answer"]').forEach(input => {
    input.addEventListener("change", () => {
      answers[currentQuestion] = Number(input.value);
      answeredCount.textContent =
        `Terjawab: ${answers.filter(a => a !== null).length}`;
    });
  });

  prevBtn.disabled = currentQuestion === 0;

  if (currentQuestion === questions.length - 1) {
    nextBtn.classList.add("hidden");
    submitBtn.classList.remove("hidden");
  } else {
    nextBtn.classList.remove("hidden");
    submitBtn.classList.add("hidden");
  }
}

prevBtn.addEventListener("click", () => {
  if (currentQuestion > 0) {
    currentQuestion--;
    renderQuestion();
  }
});

nextBtn.addEventListener("click", () => {
  if (currentQuestion < questions.length - 1) {
    currentQuestion++;
    renderQuestion();
  }
});

submitBtn.addEventListener("click", () => submitExam(false));

async function submitExam(autoSubmit) {
  if (submitting) return;

  if (!autoSubmit) {
    const unanswered = answers.filter(a => a === null).length;
    const message = unanswered
      ? `Masih ada ${unanswered} soal yang belum dijawab. Tetap kirim?`
      : "Yakin ingin menyelesaikan ujian?";

    if (!confirm(message)) return;
  }

  submitting = true;
  stopTimer();

  const correct = answers.reduce((total, answer, index) => {
    return total + (answer === questions[index].answer ? 1 : 0);
  }, 0);

  const wrong = questions.length - correct;
  const score = Math.round((correct / questions.length) * 100);

  try {
    await addDoc(collection(db, "hasil_ujian"), {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      ujian: "Dasar-Dasar Web",
      totalSoal: questions.length,
      benar: correct,
      salah: wrong,
      nilai: score,
      waktuSubmit: serverTimestamp()
    });

    cbtCard.classList.add("hidden");
    resultCard.classList.remove("hidden");

    resultEl.innerHTML = `
      <div class="result-box">
        <p><strong>Peserta:</strong> ${escapeHtml(auth.currentUser.email)}</p>
        <p><strong>Ujian:</strong> Dasar-Dasar Web</p>
        <p class="score">${score}</p>
        <p><strong>Benar:</strong> ${correct}</p>
        <p><strong>Salah:</strong> ${wrong}</p>
        <p><strong>Tidak dijawab:</strong> ${answers.filter(a => a === null).length}</p>
        <p>Hasil ujian berhasil disimpan secara online.</p>
      </div>
    `;
  } catch (error) {
    submitting = false;
    alert("Gagal menyimpan hasil ke Firebase: " + error.message);
  }
}

async function loadExamResults() {
  const snapshot = await getDocs(collection(db, "hasil_ujian"));

  if (snapshot.empty) {
    return "<p>Belum ada hasil ujian siswa.</p>";
  }

  const results = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    results.push({
      email: data.email || "-",
      ujian: data.ujian || "-",
      totalSoal: data.totalSoal || 0,
      benar: data.benar || 0,
      salah: data.salah || 0,
      nilai: data.nilai || 0,
      waktuSubmit: data.waktuSubmit
        ? data.waktuSubmit.toDate().toLocaleString("id-ID")
        : "-"
    });
  });

results.sort((a, b) => b.nilai - a.nilai);

const jumlahPeserta = results.length;

const totalNilai = results.reduce(
  (total, item) => total + Number(item.nilai),
  0
);

const nilaiRataRata =
  jumlahPeserta > 0
    ? (totalNilai / jumlahPeserta).toFixed(2)
    : 0;

const nilaiTertinggi =
  jumlahPeserta > 0
    ? Math.max(...results.map(item => Number(item.nilai)))
    : 0;

return `
  <h3>Daftar Hasil Ujian Siswa</h3>
<button
  type="button"
  id="downloadExcel"
  style="
    width:100%;
    padding:12px;
    margin:15px 0;
    border:none;
    border-radius:8px;
    cursor:pointer;
  "
>
  📥 Download Hasil Excel
</button>

  <input
    type="text"
    id="searchStudent"
    placeholder="Cari email siswa..."
    style="
      width:100%;
      padding:12px;
      margin:15px 0;
      border:1px solid #ccc;
      border-radius:8px;
      box-sizing:border-box;
    "
  />

  <select
    id="filterExam"
    style="
      width:100%;
      padding:12px;
      margin:0 0 15px 0;
      border:1px solid #ccc;
      border-radius:8px;
      box-sizing:border-box;
    "
  >
    <option value="">Semua Ujian</option>
    <option value="Dasar-Dasar Web">Dasar-Dasar Web</option>
  </select>

  <div style="
    display:grid;
    grid-template-columns:repeat(3, 1fr);
    gap:15px;
    margin:20px 0;
  ">

    <div style="
      padding:20px;
      border-radius:10px;
      background:#f1f5f9;
      text-align:center;
    ">
      <h4>Jumlah Peserta</h4>
      <strong style="font-size:28px;">
        ${jumlahPeserta}
      </strong>
    </div>

    <div style="
      padding:20px;
      border-radius:10px;
      background:#f1f5f9;
      text-align:center;
    ">
      <h4>Nilai Rata-rata</h4>
      <strong style="font-size:28px;">
        ${nilaiRataRata}
      </strong>
    </div>

    <div style="
      padding:20px;
      border-radius:10px;
      background:#f1f5f9;
      text-align:center;
    ">
      <h4>Nilai Tertinggi</h4>
      <strong style="font-size:28px;">
        ${nilaiTertinggi}
      </strong>
    </div>

  </div>

  <div style="overflow-x:auto;">
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr>
          <th>No</th>
          <th>Email Siswa</th>
          <th>Ujian</th>
          <th>Total</th>
          <th>Benar</th>
          <th>Salah</th>
          <th>Nilai</th>
          <th>Waktu Submit</th>
        </tr>
      </thead>

      <tbody>
        ${results.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.email)}</td>
            <td>${escapeHtml(item.ujian)}</td>
            <td>${item.totalSoal}</td>
            <td>${item.benar}</td>
            <td>${item.salah}</td>
            <td><strong>${item.nilai}</strong></td>
            <td>${escapeHtml(item.waktuSubmit)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
`;
}

function filterResults() {
  const keyword =
    document.getElementById("searchStudent")?.value.toLowerCase() || "";

  const selectedExam =
    document.getElementById("filterExam")?.value.toLowerCase() || "";

  document.querySelectorAll("#result table tbody tr").forEach((row) => {
    const email = row.cells[1]?.textContent.toLowerCase() || "";
    const exam = row.cells[2]?.textContent.toLowerCase() || "";

    const matchEmail = email.includes(keyword);
    const matchExam = selectedExam === "" || exam === selectedExam;

    row.style.display =
      matchEmail && matchExam ? "" : "none";
  });
}

document.addEventListener("input", (e) => {
  if (e.target.id === "searchStudent") {
    filterResults();
  }
});

document.addEventListener("change", (e) => {
  if (e.target.id === "filterExam") {
    filterResults();
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

document.addEventListener("click", (e) => {
  if (e.target.id !== "downloadExcel") return;

  const rows = [];

  document.querySelectorAll("#result table tbody tr").forEach((row) => {
    rows.push([
      row.cells[0]?.textContent.trim() || "",
      row.cells[1]?.textContent.trim() || "",
      row.cells[2]?.textContent.trim() || "",
      row.cells[3]?.textContent.trim() || "",
      row.cells[4]?.textContent.trim() || "",
      row.cells[5]?.textContent.trim() || "",
      row.cells[6]?.textContent.trim() || "",
      row.cells[7]?.textContent.trim() || ""
    ]);
  });

  if (rows.length === 0) {
    alert("Tidak ada hasil ujian untuk diunduh.");
    return;
  }

  const header = [
    "No",
    "Email Siswa",
    "Ujian",
    "Total",
    "Benar",
    "Salah",
    "Nilai",
    "Waktu Submit"
  ];

  const csvRows = [
    header,
    ...rows
  ];

  const csvContent = csvRows
    .map(row =>
      row.map(value =>
        `"${String(value).replaceAll('"', '""')}"`
      ).join(";")
    )
    .join("\n");

  const blob = new Blob(
    ["\uFEFF" + csvContent],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "Hasil_Ujian_SMK_DIPSA.csv";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};