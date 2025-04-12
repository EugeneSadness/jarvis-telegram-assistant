require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const { processCommand, isJarvisCommand } = require('./utils/commandProcessor');
const { sendToDeepSeek } = require('./services/deepseekService');

// Проверка наличия необходимых переменных окружения
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN не найден в .env файле');
  process.exit(1);
}

// Инициализация бота
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const app = express();
app.use(express.json());

// Хранение последних чатов
let recentChats = [];

// Обработка входящих сообщений
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text || '';
  
  // Добавление чата в список последних чатов (если его еще нет)
  if (!recentChats.some(chat => chat.id === chatId)) {
    recentChats.push({
      id: chatId,
      title: msg.chat.title || `${msg.chat.first_name || ''} ${msg.chat.last_name || ''}`.trim() || 'Личный чат',
      lastMessageTime: new Date().getTime()
    });
    
    // Сортировка чатов по времени последнего сообщения
    recentChats.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    
    // Ограничение списка до 100 чатов
    if (recentChats.length > 100) {
      recentChats = recentChats.slice(0, 100);
    }
  } else {
    // Обновление времени последнего сообщения
    const chatIndex = recentChats.findIndex(chat => chat.id === chatId);
    if (chatIndex !== -1) {
      recentChats[chatIndex].lastMessageTime = new Date().getTime();
      // Пересортировка
      recentChats.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    }
  }
  
  // Проверка, является ли сообщение командой для Jarvis
  if (isJarvisCommand(messageText)) {
    console.log(`Получена команда Jarvis: ${messageText}`);
    
    try {
      // Обработка команды
      const commandResult = processCommand(messageText);
      
      if (commandResult.command === 'send_message') {
        // Команда отправки сообщения
        const { text, chatCount } = commandResult;
        const targetChats = recentChats.slice(0, chatCount).filter(chat => chat.id !== chatId);
        
        // Отправка сообщения в указанное количество чатов
        let sentCount = 0;
        for (const chat of targetChats) {
          try {
            await bot.sendMessage(chat.id, text);
            sentCount++;
            // Небольшая задержка между отправками, чтобы не нарушать лимиты Telegram API
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Ошибка при отправке сообщения в чат ${chat.id}:`, error.message);
          }
        }
        
        // Подтверждение пользователю
        bot.sendMessage(chatId, `Сообщение "${text}" отправлено в ${sentCount} чатов.`);
      } else {
        // Отправка запроса к DeepSeek API для генерации ответа
        try {
          const aiResponse = await sendToDeepSeek(messageText);
          bot.sendMessage(chatId, aiResponse);
        } catch (error) {
          console.error('Ошибка при обращении к DeepSeek API:', error.message);
          bot.sendMessage(chatId, 'Извините, произошла ошибка при обработке вашего запроса. Попробуйте еще раз позже.');
        }
      }
    } catch (error) {
      console.error('Ошибка при обработке команды:', error.message);
      bot.sendMessage(chatId, 'Извините, произошла ошибка при обработке вашей команды. Проверьте формат команды и попробуйте снова.');
    }
  }
});

// API Эндпоинт для интеграции с n8n
app.post('/api/jarvis/command', async (req, res) => {
  try {
    const { command, text, chatCount, userId } = req.body;
    
    if (command === 'send_message' && text && chatCount) {
      const targetChats = recentChats.slice(0, chatCount);
      let sentCount = 0;
      
      for (const chat of targetChats) {
        try {
          await bot.sendMessage(chat.id, text);
          sentCount++;
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Ошибка при отправке сообщения в чат ${chat.id}:`, error.message);
        }
      }
      
      // Отправить подтверждение пользователю, если указан userId
      if (userId) {
        bot.sendMessage(userId, `Сообщение "${text}" отправлено в ${sentCount} чатов.`);
      }
      
      res.json({ success: true, sentCount, totalChats: targetChats.length });
    } else {
      res.status(400).json({ success: false, error: 'Неверный формат команды' });
    }
  } catch (error) {
    console.error('Ошибка при обработке API запроса:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Запуск Express сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

console.log('Jarvis Telegram бот запущен...');