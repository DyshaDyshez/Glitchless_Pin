const functions = require('firebase-functions');
const axios = require('axios');

exports.chat = functions.https.onRequest(async (req, res) => {
    // Разрешаем запросы с любого адреса (для твоего сайта)
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }
    
    try {
        // БЕРЁМ КЛЮЧ ИЗ СЕКРЕТА (будет скрыт)
        const API_KEY = functions.config().openrouter.key;
        
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            req.body,
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.status(500).json({ error: error.message });
    }
});