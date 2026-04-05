Для работы нужны зависимости: node, grammy, dotenv, nodemon
Node можно скачать с оф. сайта, версию LTS
Остальное: npm i grammy, dotenv, nodemon
Запуск: npm start
Остановка: ctrl+c

Для хоста на сервер необходимо установить git и командой git clone https://github.com/SemionGordienko/telegram_bot_EP.git
Установить npm и nodejs, затем обновить их до актуальных и установить зависимости npm i
Далее установить менеджер процессов pm2: npm i pm2 -g
В конце нужно создать вручную файл .env с содержимым BOT_API_KEY=(апи ключ бота)

Запуск: pm2 start index.js