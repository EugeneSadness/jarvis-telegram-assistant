/**
 * Проверяет, является ли сообщение командой для Jarvis
 * @param {string} message - Текст сообщения
 * @returns {boolean} - true, если это команда для Jarvis
 */
function isJarvisCommand(message) {
  return message && typeof message === 'string' && message.toLowerCase().trim().startsWith('jarvis');
}

/**
 * Обрабатывает команду для Jarvis
 * @param {string} message - Текст сообщения с командой
 * @returns {Object} - Результат обработки команды
 */
function processCommand(message) {
  // Убираем префикс "Jarvis" и лишние пробелы
  const command = message.substring(6).trim();
  
  // Проверка команды отправки сообщения
  // Формат: "Jarvis, отправь \"текст сообщения\" последним X чатам"
  const sendMessageRegex = /отправь\s+"([^"]*)"\s+последним\s+(\d+)\s+чатам/i;
  const match = command.match(sendMessageRegex);
  
  if (match) {
    const textToSend = match[1];
    const chatCount = parseInt(match[2], 10);
    
    return {
      command: 'send_message',
      text: textToSend,
      chatCount: chatCount
    };
  }
  
  // Если команда не распознана, возвращаем оригинальное сообщение
  return {
    command: 'unknown',
    originalMessage: message
  };
}

module.exports = { isJarvisCommand, processCommand };