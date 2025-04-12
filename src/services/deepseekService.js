const axios = require('axios');

/**
 * Отправляет запрос к DeepSeek API и получает ответ
 * @param {string} message - Текст сообщения пользователя
 * @returns {Promise<string>} - Ответ от DeepSeek API
 */
async function sendToDeepSeek(message) {
  try {
    // Проверка наличия API ключа
    if (!process.env.DEEPSEEK_API_KEY) {
      console.error('DEEPSEEK_API_KEY не найден в .env файле');
      return 'Извините, API ключ DeepSeek не настроен. Пожалуйста, свяжитесь с администратором.';
    }
    
    // Формирование запроса к DeepSeek API
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Ты Jarvis, умный ассистент, который помогает пользователю с различными задачами. Отвечай кратко и по делу.'
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Извлечение ответа из результата API
    if (response.data && 
        response.data.choices && 
        response.data.choices.length > 0 && 
        response.data.choices[0].message) {
      return response.data.choices[0].message.content;
    } else {
      console.error('Неожиданный формат ответа от DeepSeek API:', response.data);
      return 'Извините, я не смог обработать ваш запрос. Попробуйте другую формулировку.';
    }
  } catch (error) {
    console.error('Ошибка при обращении к DeepSeek API:', error.message);
    if (error.response) {
      console.error('Детали ошибки:', error.response.data);
    }
    return 'Извините, произошла ошибка при обращении к DeepSeek API. Попробуйте позже.';
  }
}

module.exports = { sendToDeepSeek };