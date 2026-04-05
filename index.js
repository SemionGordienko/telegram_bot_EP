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
        checklistName: ''
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
    ctx.session.selectedOffice = [];

    const greetKeyboard = new InlineKeyboard()
        .text('ЕП1', 'office_1')
        .text('ЕП2', 'office_2')
        .text('ЕП3', 'office_3')
        .text('ЕП4','office_4')
        .text('ЕП5','office_5')
    await ctx.reply('Выбери филлиал', {
        reply_markup: greetKeyboard,
    });
});

bot.callbackQuery(/^office_/, async (ctx) => {
    const dataO = ctx.callbackQuery.data;
    const officeKey = dataO.replace('office_','');
    ctx.session.selectedOffice = officeKey;
    ctx.session.officeName = 'Офис: ЕП'+ officeKey

    const keyboard = new InlineKeyboard()
        .text('Утренний', `form_morning_EP${officeKey}`)
        .text('Вечер Рук.ф', `form_eveningH_EP${officeKey}`)
        .text('Вечер Оператор', `form_eveningO_EP${officeKey}`);

    await ctx.answerCallbackQuery();

    await ctx.reply('Выбери чек-лист', {
        reply_markup: keyboard,
    });
})

bot.callbackQuery(/^form_/, async (ctx) => {
    const data = ctx.callbackQuery.data;
    const formKey = data.replace('form_', '');
    const selectedForm = forms[formKey];
    ctx.session.checklistName = selectedForm.title;

    if (!selectedForm || !selectedForm.questions || !selectedForm.questions.length) {
        await ctx.answerCallbackQuery();
        return;
    }

    ctx.session.currentForm = selectedForm;
    ctx.session.answers = [];
    ctx.session.step = 0;
    ctx.session.waitingPhoto = false;

    await ctx.answerCallbackQuery();

    await ctx.reply(
        selectedForm.questions[0].question,
        {
            reply_markup: createKeyboard(0, selectedForm)
        }
    );
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
        await ctx.reply('Анкета завершена. Приложи фото, без текста');
        return;
    }

    const nextQuestion = currentForm.questions[ctx.session.step];

    if (currentForm.title === 'Вечерний чек-лист №1' && ctx.session.step === 4) {
        ctx.session.waitingText = true;
        ctx.session.waitingStep = ctx.session.step;

        await ctx.reply(nextQuestion.question);
        return;
    }

    await ctx.reply(
        currentForm.questions[ctx.session.step].question,
        {
            reply_markup: createKeyboard(ctx.session.step, currentForm)
        }
    );
});

bot.on('message:text', async (ctx) => {
    if (!ctx.session.waitingText && ctx.session.feedback) {
        const feedback = ctx.message.text;
        await bot.api.sendMessage(adminID, `Пользователь ${ctx.from.first_name} написал: ${feedback}`)
        ctx.session.feedback = false;
    }

    const step = ctx.session.waitingStep;

    ctx.session.answers[step] = ctx.message.text;
    ctx.session.waitingText = false;
    ctx.session.waitingStep = null;

    const currentForm = ctx.session.currentForm;

    if (currentForm.title === 'Вечерний чек-лист №1' && step === 4) {
        ctx.session.waitingPhoto = true;
        await ctx.reply('Анкета завершена. Приложи фото, без текста');
        return;
    }

    ctx.session.step += 1;

    if (ctx.session.step >= currentForm.questions.length) {
        ctx.session.waitingPhoto = true;
        await ctx.reply('Анкета завершена. Приложи фото, без текста');
        return;
    }

    await ctx.reply(
        currentForm.questions[ctx.session.step].question,
        {
            reply_markup: createKeyboard(ctx.session.step, currentForm)
        }
    );
});

bot.on('message:photo', async (ctx) => {
    if (!ctx.session.waitingPhoto) {
        return;
    }

    const currentForm = ctx.session.currentForm;
    const answers = ctx.session.answers;

    if (!currentForm || !currentForm.questions || !currentForm.questions.length) {
        return;
    }

    const groupID = ctx.message.media_group_id || `single_${ctx.message.message_id}`;
    const fileID = ctx.message.photo.at(-1).file_id;

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

            if (photos.length === 1) {
                await bot.api.sendPhoto(ctx.from.id, photos[0]);
            } else {
                await bot.api.sendMediaGroup(
                    ctx.from.id,
                    photos.map((photoId) => ({
                        type: 'photo',
                        media: photoId
                    }))
                );
            }

            await bot.api.sendMessage(
                ctx.from.id,
                `Заполнил(а): ${ctx.session.name}\n${ctx.session.officeName}, ${ctx.session.checklistName}\n\n${text},`
            );

            delete ctx.session.albums[groupID];
            ctx.session.albumTimeout = null;
            ctx.session.step = null;
            ctx.session.currentForm = null;
            ctx.session.answers = [];
            ctx.session.waitingPhoto = false;
            ctx.session.officeName = '';
            ctx.session.checklistName = '';
        } catch (error) {
            await ctx.reply('Ошибка при отправке фото, сообщить СГ');
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