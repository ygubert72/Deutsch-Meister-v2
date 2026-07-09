// ====================================================================
// TTS Proxy Server — Yandex SpeechKit
// Принимает текст, возвращает MP3
// ====================================================================

const express = require('express');
const cors = require('cors');
const app = express();

// ========== НАСТРОЙКИ ==========
const PORT = process.env.PORT || 3000;

// Yandex Cloud — замени на свои данные!
const YANDEX_API_KEY = 'AQVNwi11fxxxxxxxxxxxxxxxxxxxxx'; // Твой API-ключ
const YANDEX_FOLDER_ID = 'b1gjpvaf3chdvqu0qgcj';        // Твой Folder ID

// Допустимые голоса (немецкие)
const VOICES = {
    female: 'oksana',
    male: 'alena'
};

// ========== MIDDLEWARE ==========
app.use(cors()); // Разрешаем запросы с любого фронтенда
app.use(express.json());

// ========== ПРОВЕРКА ЗДОРОВЬЯ ==========
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'TTS Proxy',
        voices: VOICES
    });
});

// ========== ОСНОВНОЙ ЭНДПОИНТ TTS ==========
app.post('/tts', async (req, res) => {
    const { text, voice = 'female' } = req.body;

    // 1. Проверяем текст
    if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Текст не может быть пустым' });
    }

    // 2. Выбираем голос
    const voiceName = VOICES[voice] || VOICES.female;

    // 3. Формируем запрос к Yandex SpeechKit
    const url = 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize';
    
    const params = new URLSearchParams({
        text: text,
        lang: 'de-DE',
        voice: voiceName,
        emotion: 'neutral',
        speed: 1.0,
        format: 'mp3',
        sampleRateHertz: 48000,
        folderId: YANDEX_FOLDER_ID,
    });

    try {
        // 4. Отправляем запрос к Yandex
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Api-Key ${YANDEX_API_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        // 5. Обрабатываем ответ
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Yandex TTS ошибка:', response.status, errorText);
            return res.status(response.status).json({ 
                error: `Yandex TTS ошибка: ${response.status}`,
                details: errorText
            });
        }

        // 6. Получаем MP3 и отправляем клиенту
        const audioBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(audioBuffer);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);

    } catch (error) {
        console.error('❌ Ошибка прокси:', error);
        res.status(500).json({ error: 'Внутренняя ошибка прокси', details: error.message });
    }
});

// ========== ЗАПУСК ==========
app.listen(PORT, () => {
    console.log(`🎤 TTS Proxy запущен на порту ${PORT}`);
    console.log(`📁 Folder ID: ${YANDEX_FOLDER_ID}`);
    console.log(`🔑 API Key (первые 10 символов): ${YANDEX_API_KEY.substring(0, 10)}...`);
    console.log(`🌐 Эндпоинт: http://localhost:${PORT}/tts`);
});
