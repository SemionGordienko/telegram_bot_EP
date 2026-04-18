require('dotenv').config();
const { Bot, GrammyError, HttpError, InlineKeyboard, session } = require('grammy');

const bot = new Bot(process.env.BOT_API_KEY);

const adminID = 192403374;
const morning_EP1 = require('./json_qs/morning_EP1.json');
const eveningH_EP1 = require('./json_qs/eveningH_EP1.json');
const eveningO_EP1 = require('./json_qs/eveningO_EP1.json');

const morning_EP2 = require('./json_qs/morning_EP2.json');
const eveningH_EP2 = require('./json_qs/eveningH_EP2.json');
const eveningO_EP2 = require('./json_qs/eveningO_EP2.json');

const morning_EP3 = require('./json_qs/morning_EP3.json');
const eveningH_EP3 = require('./json_qs/eveningH_EP3.json');
const eveningO_EP3 = require('./json_qs/eveningO_EP3.json');

const morning_EP4 = require('./json_qs/morning_EP4.json');
const eveningH_EP4 = require('./json_qs/eveningH_EP4.json');
const eveningO_EP4 = require('./json_qs/eveningO_EP4.json');

const morning_EP5 = require('./json_qs/morning_EP5.json');
const eveningH_EP5 = require('./json_qs/eveningH_EP5.json');
const eveningO_EP5 = require('./json_qs/eveningO_EP5.json');

const forms = {
    morning_EP1: morning_EP1,
    eveningH_EP1: eveningH_EP1,
    eveningO_EP1: eveningO_EP1,

    morning_EP2: morning_EP2,
    eveningH_EP2: eveningH_EP2,
    eveningO_EP2: eveningO_EP2,

    morning_EP3: morning_EP3,
    eveningH_EP3: eveningH_EP3,
    eveningO_EP3: eveningO_EP3,

    morning_EP4: morning_EP4,
    eveningH_EP4: eveningH_EP4,
    eveningO_EP4: eveningO_EP4,

    morning_EP5: morning_EP5,
    eveningH_EP5: eveningH_EP5,
    eveningO_EP5: eveningO_EP5,
};

function createKeyboard(step, currentForm) {
    const keyboard = new InlineKeyboard();
    const currentQuestion = currentForm.questions[step];

    currentQuestion.answers.forEach((answer, index) => {
        keyboard.text(answer, `answer_${index}`).row();
    });

    return keyboard;
}

bot.api.setMyCommands([
    {
        command: 'start', description: 'Запуск бота'
    },
    {
        command: 'checklist', description: 'Заполнение чеклиста'
    },
    {
        command: 'portal', description: 'Портал с личным кабинетом'
    },
    {
        command: 'feedback', description: 'Дать фидбек'
    }
]);

bot.use(session({
    initial: () => ({
        step: null,
        currentForm: null,
        answers: [],
        albums: {},
        albumTimeout: null,
        name: '',
        waitingPhoto: false,
        feedback: false,
        selectedOffice: [],
        officeName: '',
        checklistName: '',
        photos: [],
        waitingText: false,
        waitingStep: null,
        waitingMorePhotos: false,
    })
}));

bot.command('feedback', async (ctx) => {
    await ctx.reply('Опишите фидбек в одном сообщении.');
    ctx.session.feedback = true;
})

bot.command('start', async (ctx) => {
    const username = ctx.from.username;
    const id = ctx.from.id;

    console.log(id, username, 'Нажал старт');

    await ctx.reply(`
В этом боте ты можешь:
Получить ссылку на портал /portal
Заполнить чеклист /checklist

Внизу есть меню с командами для удобства
    `);
});

bot.command('portal', async (ctx) => {
    await ctx.reply(
        'Ссылка на портал: <a href="https://upidea.ru">UPIDEA.RU</a>',
        { parse_mode: 'HTML' }
    );
});

bot.command('checklist', async (ctx) => {
    ctx.session.step = null;
    ctx.session.currentForm = null;
    ctx.session.answers = [];
    ctx.session.albums = {};
    ctx.session.albumTimeout = null;
    ctx.session.name = ctx.from.first_name;
    ctx.session.waitingPhoto = false;
    ctx.session.waitingText = false;
    ctx.session.waitingStep = null;
    ctx.session.waitingMorePhotos = false;
    ctx.session.selectedOffice = [];
    ctx.session.officeName = '';
    ctx.session.checklistName = '';
    ctx.session.photos = [];

    await ctx.reply('Введите абривиатуру филлиала с номером');
});

bot.callbackQuery(/^form_/, async (ctx) => {
    const data = ctx.callbackQuery.data;

    const formKey = data.replace('form_', '');
    const selectedForm = forms[formKey];

    function shuffleArray(array) {
        const result = [...array];

        for (let i = result.length - 1; i > 0; i--) {
            const randomIndex = Math.floor(Math.random() * (i + 1));
            const temp = result[i];
            result[i] = result[randomIndex];
            result[randomIndex] = temp;
        }

        return result;
    }

    if (!selectedForm || !selectedForm.questions || !selectedForm.questions.length) {
        await ctx.answerCallbackQuery();
        return;
    }

    const shuffledQuestions = shuffleArray(selectedForm.questions).map((question) => {
        return {
            ...question,
            answers: shuffleArray(question.answers)
        };
    });

    ctx.session.currentForm = {
        ...selectedForm,
        questions: shuffledQuestions
    };

    ctx.session.answers = [];
    ctx.session.step = 0;
    ctx.session.waitingPhoto = false;
    ctx.session.waitingText = false;
    ctx.session.waitingStep = null;
    ctx.session.waitingMorePhotos = false;
    ctx.session.checklistName = selectedForm.title;

    await ctx.answerCallbackQuery();

    const firstQuestion = ctx.session.currentForm.questions[0];

    if (firstQuestion.type === 'text') {
        ctx.session.waitingText = true;
        ctx.session.waitingStep = 0;

        await ctx.reply(firstQuestion.question);
        return;
    }

    await ctx.reply(
        firstQuestion.question,
        {
            reply_markup: createKeyboard(0, ctx.session.currentForm)
        }
    );

    return;
});

bot.callbackQuery(/^answer_/, async (ctx) => {
    const data = ctx.callbackQuery.data;
    const currentForm = ctx.session.currentForm;
    const step = ctx.session.step;

    if (!currentForm || step === null) {
        await ctx.answerCallbackQuery();
        return;
    }

    const currentQuestion = currentForm.questions[step];

    if (!currentQuestion) {
        await ctx.answerCallbackQuery();
        return;
    }

    const answerIndex = Number(data.replace('answer_', ''));
    const selectedAnswer = currentQuestion.answers[answerIndex];

    ctx.session.answers.push(selectedAnswer);
    ctx.session.step += 1;

    await ctx.answerCallbackQuery();

    if (ctx.session.step >= currentForm.questions.length) {
        ctx.session.waitingPhoto = true;
        await ctx.reply('Вопросы завершены. Приложи фото результатов, без текста');
        return;
    }

    const nextQuestion = currentForm.questions[ctx.session.step];

    if (nextQuestion.type === 'text') {
        ctx.session.waitingText = true;
        ctx.session.waitingStep = ctx.session.step;

        await ctx.reply(nextQuestion.question);
        return;
    }

    await ctx.reply(
        nextQuestion.question,
        {
            reply_markup: createKeyboard(ctx.session.step, currentForm)
        }
    );
});

bot.callbackQuery(/^photo_/, async (ctx) => {
    const data = ctx.callbackQuery.data;

    await ctx.answerCallbackQuery();

    if (!ctx.session.waitingMorePhotos) {
        return;
    }

    if (data === 'photo_more') {
        ctx.session.waitingPhoto = true;
        ctx.session.waitingMorePhotos = false;

        await ctx.reply('Пришли еще фото');
        return;
    }

    if (data === 'photo_finish') {
        const currentForm = ctx.session.currentForm;
        const answers = ctx.session.answers;
        const photos = ctx.session.photos;

        if (!currentForm || !currentForm.questions || !currentForm.questions.length) {
            return;
        }

        const text = currentForm.questions
            .map((item, index) => {
                const generalQuestion = item.generalQuestion;
                const answer = answers[index] || 'Нет ответа';

                return `${generalQuestion} ${answer}`;
            })
            .join('\n');

        if (!photos || !photos.length) {
            await ctx.reply('Фото не найдены');
            return;
        }

        const chunks = [];

        for (let i = 0; i < photos.length; i += 10) {
            chunks.push(photos.slice(i, i + 10));
        }

        for (const chunk of chunks) {
            if (chunk.length === 1) {
                await bot.api.sendPhoto(ctx.from.id, chunk[0]);
            } else {
                await bot.api.sendMediaGroup(
                    ctx.from.id,
                    chunk.map((photoId) => ({
                        type: 'photo',
                        media: photoId
                    }))
                );
            }
        }

        await bot.api.sendMessage(
            ctx.from.id,
            `Заполнил(а): ${ctx.session.name}\n${ctx.session.officeName}, ${ctx.session.checklistName}\n\n${text}`
        );
        await ctx.reply('Анкета завершена!')

        ctx.session.step = null;
        ctx.session.currentForm = null;
        ctx.session.answers = [];
        ctx.session.albums = {};
        ctx.session.albumTimeout = null;
        ctx.session.waitingPhoto = false;
        ctx.session.waitingMorePhotos = false;
        ctx.session.officeName = '';
        ctx.session.checklistName = '';
        ctx.session.photos = [];
    }
});

bot.on('message:text', async (ctx) => {
    if (ctx.session.feedback) {
        const feedback = ctx.message.text;
        await bot.api.sendMessage(adminID, `Пользователь ${ctx.from.first_name} написал: ${feedback}`);
        ctx.session.feedback = false;
        return;
    }

    if (ctx.session.waitingText) {
        const step = ctx.session.waitingStep;
        const currentForm = ctx.session.currentForm;

        if (!currentForm || step === null) {
            return;
        }

        ctx.session.answers[step] = ctx.message.text;
        ctx.session.waitingText = false;
        ctx.session.waitingStep = null;
        ctx.session.step += 1;

        if (ctx.session.step >= currentForm.questions.length) {
            ctx.session.waitingPhoto = true;
            await ctx.reply('Вопросы завершены. Приложи фото с результатами, без текста');
            return;
        }

        const nextQuestion = currentForm.questions[ctx.session.step];

        if (nextQuestion.type === 'text') {
            ctx.session.waitingText = true;
            ctx.session.waitingStep = ctx.session.step;

            await ctx.reply(nextQuestion.question);
            return;
        }

        await ctx.reply(
            nextQuestion.question,
            {
                reply_markup: createKeyboard(ctx.session.step, currentForm)
            }
        );
        return;
    }

    const text = ctx.message.text.trim().toLowerCase();

    if (text.length === 3 && text.startsWith('еп')) {
        const officeKey = text[2];
        ctx.session.selectedOffice = officeKey;
        ctx.session.officeName = 'Офис: ЕП' + officeKey;

        const keyboard = new InlineKeyboard()
            .text('Утренний', `form_morning_EP${officeKey}`)
            .text('Вечер Рук.ф', `form_eveningH_EP${officeKey}`)
            .text('Вечер Оператор', `form_eveningO_EP${officeKey}`);

        await ctx.reply('Выбери чек-лист', {
            reply_markup: keyboard,
        });
    }
});

bot.on('message:photo', async (ctx) => {
    if (!ctx.session.waitingPhoto) {
        return;
    }

    const fileID = ctx.message.photo.at(-1).file_id;
    const groupID = ctx.message.media_group_id || `single_${ctx.message.message_id}`;

    if (!ctx.session.albums[groupID]) {
        ctx.session.albums[groupID] = [];
    }

    ctx.session.albums[groupID].push(fileID);

    if (ctx.session.albumTimeout) {
        clearTimeout(ctx.session.albumTimeout);
    }

    ctx.session.albumTimeout = setTimeout(async () => {
        try {
            const photos = ctx.session.albums[groupID];

            if (!photos || !photos.length) {
                await ctx.reply('Фото не найдены');
                return;
            }

            ctx.session.photos.push(...photos);
            delete ctx.session.albums[groupID];
            ctx.session.albumTimeout = null;
            ctx.session.waitingMorePhotos = true;

            const photoKeyboard = new InlineKeyboard()
                .text('Еще фото', 'photo_more')
                .text('Завершить', 'photo_finish');

            await ctx.reply('Фото получены. Будут еще?', {
                reply_markup: photoKeyboard
            });
        } catch (error) {
            await ctx.reply('Ошибка при обработке фото, сообщить СГ');
        }
    }, 1500);
});

bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;

    if (e instanceof GrammyError) {
        console.error('Error in request', e.description);
    } else if (e instanceof HttpError) {
        console.error('Could not connect to telegram', e);
    } else {
        console.error('Unknown error', e);
    }
});

bot.start();