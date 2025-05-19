import TelegramBot from 'node-telegram-bot-api';
import Binance from 'binance-api-node';
import statistics from 'statistics-lite'; // install via npm i statistics-lite
import dayjs from 'dayjs'; // install via npm i dayjs

// Token Telegram dan Binance API
const TELEGRAM_TOKEN = '7648616378:AAHiaDQAh9vVrlOmbYA4X05CfrR5UbLm3EA';
const BINANCE_API_KEY = '3YbYHtJZvgpv76wNRe6YWlk4pWM0Gxb6d8mufwVrivu1EZn35UhLT11H6d949qjE';
const BINANCE_API_SECRET = 'Y3kNNmckJPcfYBkCSXGF4tNLSepyY5gNYviFvri9ZtAvnRFOkJEeYgJyQxxuFwdN';

// Inisialisasi bot dan binance client
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const client = Binance({
  apiKey: BINANCE_API_KEY,
  apiSecret: BINANCE_API_SECRET,
});

// Fungsi analisa candlestick sederhana
async function analyzeCandlestick() {
  const klines = await client.candles({ symbol: 'DOGEUSDT', interval: '5m', limit: 20 });
  const closes = klines.map(k => parseFloat(k.close));
  const ma = statistics.mean(closes);
  const last = closes[closes.length - 1];

  let trend = '';
  if (last > ma) trend = 'Naik (Bullish) — Harga kemungkinan akan naik';
  else if (last < ma) trend = 'Turun (Bearish) — Harga kemungkinan akan turun';
  else trend = 'Sideways — Harga stabil / belum jelas arah';

  const now = dayjs().format('HH:mm:ss DD/MM/YYYY');

  return (
    `*Analisis Sederhana DOGE/USDT*\n\n` +
    `• Harga terakhir: *${last.toFixed(4)} USDT*\n` +
    `• Rata-rata 20 candle: *${ma.toFixed(4)} USDT*\n` +
    `• Kesimpulan: *${trend}*\n\n` +
    `_Diperbarui: ${now}_`
  );
}

// Fungsi kirim analisis
async function sendAnalysis(chatId, messageId = null) {
  const text = await analyzeCandlestick();
  const opts = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: 'Cek Ulang', callback_data: 'cek_ulang' }]],
    },
  };

  if (messageId) {
    // Edit pesan untuk callback
    try {
      await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...opts });
    } catch (e) {
      // Kalau gagal edit, kirim pesan baru
      await bot.sendMessage(chatId, 'Gagal update. Coba lagi nanti.', { reply_markup: { remove_keyboard: true } });
    }
  } else {
    // Kirim pesan baru
    await bot.sendMessage(chatId, text, opts);
  }
}

// Listener command /cek
bot.onText(/\/cek/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, 'Mengambil data candlestick...');
  await sendAnalysis(chatId);
});

// Listener callback button
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  if (callbackQuery.data === 'cek_ulang') {
    await sendAnalysis(chatId, messageId);
    await bot.answerCallbackQuery(callbackQuery.id);
  }
});

console.log('Bot Telegram trading aktif...');
