// Memuat variabel lingkungan dari file .env
require('dotenv').config();

// Mengimpor library yang dibutuhkan
const express = require('express'); // Framework untuk membuat server web
const cors = require('cors'); // Middleware untuk mengizinkan permintaan dari domain lain (Cross-Origin Resource Sharing)
const { GoogleGenerativeAI } = require('@google/generative-ai'); // SDK dari Google untuk berinteraksi dengan Gemini API

// --- Inisialisasi Aplikasi dan Model AI ---

// Membuat instance aplikasi Express
const app = express();

// Membuat instance GoogleGenerativeAI dengan kunci API dari variabel lingkungan
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Memilih model AI yang akan digunakan (dalam hal ini, gemini-1.5-flash)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

/**
 * Fungsi bantuan untuk mengekstrak teks dari respons Gemini API secara aman.
 * Fungsi ini mencoba beberapa kemungkinan struktur respons untuk memastikan kompatibilitas
 * dan mengembalikan JSON jika teks tidak ditemukan.
 */
const extractText = (response) => {
  // Mencoba mengekstrak teks dari struktur respons yang paling umum
  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text ?? response?.text?.();
  if (text) {
    return text;
  }
  // Jika tidak ada teks yang ditemukan, kembalikan seluruh respons sebagai string JSON untuk debugging
  return JSON.stringify(response, null, 2);
};

// --- Middleware ---

// Menggunakan middleware CORS untuk mengizinkan semua permintaan lintas domain
app.use(cors());

// Menggunakan middleware express.json() agar server bisa mem-parsing body permintaan dalam format JSON
app.use(express.json());

// --- Definisi Endpoint (Rute) ---

/**
 * Endpoint untuk chat satu putaran (single-turn).
 * Hanya menerima satu pesan dan langsung membalas.
 */
app.post('/chat', async (req, res) => {
  try {
    // Mengambil 'message' dari body permintaan
    const { message } = req.body;
    // Mengirim pesan ke model Gemini
    const result = await model.generateContent(message);
    // Mendapatkan respons dari hasil
    const response = await result.response;
    // Mengekstrak teks dari respons
    const text = extractText(response);
    // Mengirim balasan berisi teks yang diekstrak
    res.send({ message: text });
  } catch (error) {
    // Menangani error jika terjadi
    console.error(error);
    res.status(500).send({ error: error.message });
  }
});

/**
 * Endpoint untuk chat multi-putaran (multi-turn).
 * Menerima array 'messages' yang berisi riwayat percakapan.
 */
app.post('/api/chat', async (req, res) => {
  try {
    // Mengambil array 'messages' dari body permintaan
    const { messages } = req.body;

    // Validasi: Memastikan 'messages' adalah sebuah array
    if (!Array.isArray(messages)) {
      return res.status(400).send({ error: 'Messages must be an array' });
    }

    // Mengubah format array 'messages' dari front-end menjadi format yang dimengerti oleh Gemini API
    const contents = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.message || msg.content }] // Menerima properti 'message' atau 'content'
    }));

    // Validasi: Memastikan tidak ada pesan dengan konten kosong yang dikirim ke API
    for (const content of contents) {
      if (!content.parts[0].text) {
        return res.status(400).send({ error: 'Each message must have a non-empty message or content property.' });
      }
    }

    // Mengirim seluruh riwayat percakapan ke model Gemini
    const result = await model.generateContent({ contents });
    // Mendapatkan respons dari hasil
    const response = await result.response;
    // Mengekstrak teks dari respons
    const text = extractText(response);

    // Mengirim balasan berisi teks yang diekstrak
    res.send({ message: text });

  } catch (error) {
    // Menangani error jika terjadi
    console.error(error);
    res.status(500).send({ error: error.message });
  }
});

// --- Menjalankan Server ---

// Menentukan port untuk server, menggunakan variabel lingkungan atau default ke 3000
const port = process.env.PORT || 3000;

// Menjalankan server pada port yang telah ditentukan
app.listen(port, () => {
  console.log(`Server berjalan di port ${port}`);
});
