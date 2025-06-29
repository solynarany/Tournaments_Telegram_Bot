const TelegramBot = require('node-telegram-bot-api'); 
const bot = new TelegramBot('7563077731:AAFNB3ZIC31wF6gWc48a6bFQJInrF2klocA', { polling: true }); 
let tournaments = {};
let pendingResults = {};

const commandsKeyboard = {
    reply_markup: {
        keyboard: [
            ['/newTournament'],
            ['/completedTournaments']
        ],
        resize_keyboard: true,
        one_time_keyboard: true
    }
};

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeText = `👋 Привет! Я бот для создания турниров. Вот что я умею:\n\n` +
                       `/newTournament - создать новый турнир\n` +
                       `/completedTournaments - посмотреть завершенные турниры`;
    bot.sendMessage(chatId, welcomeText, commandsKeyboard);
});

// Обработчик команды /completedTournaments
bot.onText(/\/completedTournaments/, (msg) => {
    const chatId = msg.chat.id;
    const today = new Date().toISOString().split('T')[0];

    const completed = Object.entries(tournaments)
        .filter(([_, t]) => t.endDate < today && !t.result)
        .map(([name, _], index) => ({ id: index + 1, name }));
    
    if (completed.length === 0) {
        return bot.sendMessage(chatId, 'Нет завершенных турниров без результата.');
    }
    
    let response = 'Завершенные турниры (укажите ID для добавления результата):\n\n';
    completed.forEach(t => {
        response += `🆔 ${t.id}. ${t.name}\n`;
    });

    bot.sendMessage(chatId, response).then(() => {
        bot.once('message', (msg) => {
            const selectedId = parseInt(msg.text);
            const tournament = completed.find(t => t.id === selectedId);
            
            if (!tournament) {
                return bot.sendMessage(chatId, '❌ Неверный ID турнира!');
            }

            pendingResults[chatId] = tournament.name;
            bot.sendMessage(chatId, `Укажите результат для "${tournament.name}" (true/false):`, {
                reply_markup: {
                    keyboard: [['true', 'false']],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            });
        });
    });
});

// Обработчик результатов true/false
bot.onText(/^(true|false)$/, (msg, match) => {
    const chatId = msg.chat.id;
    const result = match[0] === 'true';
    const tournamentName = pendingResults[chatId];
    
    if (tournamentName) {
        tournaments[tournamentName].result = result;
        delete pendingResults[chatId];
        bot.sendMessage(chatId, `✅ Результат "${result}" сохранен для турнира "${tournamentName}"!`);
    }
});

// Обработчик команды /newTournament
bot.onText(/\/newTournament/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, 'Введите название турнира').then(() => {
        bot.once('message', (msg) => {
            const tournamentsName = msg.text;
            
            if (!tournamentsName) {
                return bot.sendMessage(chatId, 'Название не может быть пустым');
            }

            bot.sendMessage(chatId, 'Отправьте фото').then(() => {
                bot.once('photo', (msg) => {
                    const photoId = msg.photo[msg.photo.length - 1].file_id;

                    bot.sendMessage(chatId, 'Отправьте дату (в формате ГГГГ-ММ-ДД)').then(() => {
                        bot.once('message', (msg) => {
                            const msg_date = msg.text.trim();
                            const datePattern = /^\d{4}-\d{2}-\d{2}$/;
                            
                            if (!datePattern.test(msg_date)) {
                                return bot.sendMessage(chatId, 'Неверный формат даты. Используйте ГГГГ-ММ-ДД');
                            }

                            tournaments[tournamentsName] = { photo: photoId, endDate: msg_date };
                            bot.sendMessage(chatId, 'Турнир успешно создан!');
                        });
                    });
                });
            });
        });
    });
});