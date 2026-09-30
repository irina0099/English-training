import type { Level, VocabItem } from '../types';
import { slug } from './build';

/** [level, phrasal verb, Russian, example with *marked* verb, example translation, extra] */
type PvRow = [Level, string, string, string, string, Partial<VocabItem>?];

interface FamilySource {
  verb: string;
  ru: string;
  rows: PvRow[];
}

/**
 * Phrasal verbs grouped by their base verb, so the learner sees a verb with all
 * its common particles. Chosen from the most frequent phrasal verbs in corpus
 * lists (PHaVE, Garnier & Schmitt 2015) plus other everyday verbs.
 */
const SOURCES: FamilySource[] = [
  {
    verb: 'get',
    ru: 'получать; становиться; добираться',
    rows: [
      ['B1', 'get up', 'вставать (с постели)', 'I usually *get up* at seven.', 'Обычно я встаю в семь.'],
      ['B1', 'get on', 'садиться (в автобус, поезд)', 'Hurry up and *get on* the bus!', 'Скорее садись в автобус!', { note: 'get on/off a bus, train or plane; get into/out of a car or taxi.' }],
      ['B1', 'get off', 'выходить (из автобуса, поезда)', 'We *get off* at the next stop.', 'Мы выходим на следующей остановке.'],
      ['B1', 'get on with', 'ладить (с кем-то)', 'Do you *get on with* your colleagues?', 'Ты ладишь с коллегами?'],
      ['B1', 'get along', 'ладить, уживаться', 'My sister and I *get along* really well.', 'Мы с сестрой отлично ладим.', { note: 'get along with someone = get on with someone.' }],
      ['B1', 'get back', 'возвращаться', 'What time did you *get back* last night?', 'Во сколько ты вчера вернулся?'],
      ['B1', 'get together', 'собираться вместе, встречаться', 'Let’s *get together* at the weekend.', 'Давай встретимся на выходных.'],
      ['B2', 'get over', 'пережить, оправиться', 'It took her months to *get over* the break-up.', 'Ей понадобились месяцы, чтобы пережить расставание.'],
      ['B2', 'get by', 'сводить концы с концами, справляться', 'We don’t earn much, but we *get by*.', 'Мы мало зарабатываем, но справляемся.'],
      ['B2', 'get through', 'пережить (трудный период)', 'She helped me *get through* a very difficult year.', 'Она помогла мне пережить очень трудный год.', { note: 'Also: get through to someone = reach them by phone, or make them understand.' }],
      ['B2', 'get away with', 'остаться безнаказанным', 'He lied, and he *got away with* it.', 'Он соврал, и ему это сошло с рук.'],
      ['B2', 'get into', 'увлечься (чем-то)', 'I *got into* photography last year.', 'В прошлом году я увлёкся фотографией.'],
    ],
  },
  {
    verb: 'take',
    ru: 'брать',
    rows: [
      ['B1', 'take off', 'снимать (одежду); взлетать', 'Please *take off* your shoes.', 'Пожалуйста, снимите обувь.', { note: 'Also: The plane took off at six.' }],
      ['B1', 'take out', 'вынимать; выносить', 'Can you *take out* the rubbish?', 'Можешь вынести мусор?'],
      ['B1', 'take back', 'взять свои слова обратно; вернуть', 'I *take back* what I said. I’m sorry.', 'Беру свои слова обратно. Прости.'],
      ['B2', 'take over', 'взять на себя, перенять', 'Can you *take over* while I’m on holiday?', 'Можешь взять мои дела, пока я в отпуске?'],
      ['B2', 'take up', 'начать заниматься (хобби)', 'I’ve *taken up* running.', 'Я начал бегать.'],
      ['B2', 'take after', 'быть похожим (на родственника)', 'She *takes after* her mother.', 'Она похожа на маму.'],
      ['B2', 'take in', 'осознать, воспринять', 'It was a lot of information to *take in*.', 'Это было слишком много информации, чтобы сразу осознать.'],
      ['B2', 'take on', 'брать на себя (работу, ответственность)', 'Don’t *take on* too much at work.', 'Не бери на себя слишком много на работе.'],
    ],
  },
  {
    verb: 'put',
    ru: 'класть, ставить',
    rows: [
      ['B1', 'put on', 'надевать; включать', '*Put on* your coat, it’s cold.', 'Надень пальто, холодно.'],
      ['B1', 'put off', 'откладывать', 'Stop *putting off* your homework!', 'Хватит откладывать домашнее задание!', { note: 'put off + -ing.' }],
      ['B1', 'put away', 'убирать на место', 'Can you *put away* the dishes?', 'Можешь убрать посуду?'],
      ['B1', 'put out', 'тушить (огонь)', 'Firefighters *put out* the fire.', 'Пожарные потушили пожар.'],
      ['B2', 'put up with', 'терпеть, мириться', 'I can’t *put up with* this noise any longer.', 'Я больше не могу терпеть этот шум.'],
      ['B2', 'put down', 'унижать, принижать', 'He always *puts* her *down* in front of others.', 'Он всегда унижает её при других.'],
      ['B2', 'put forward', 'выдвигать (идею, план)', 'She *put forward* an interesting idea.', 'Она выдвинула интересную идею.'],
      ['B2', 'put together', 'собирать (из частей)', 'It took an hour to *put together* the desk.', 'Сборка стола заняла час.'],
    ],
  },
  {
    verb: 'look',
    ru: 'смотреть',
    rows: [
      ['B1', 'look after', 'заботиться, присматривать', 'Can you *look after* my cat while I’m away?', 'Можешь присмотреть за моим котом, пока меня нет?'],
      ['B1', 'look for', 'искать', 'I’m *looking for* my keys.', 'Я ищу ключи.'],
      ['B1', 'look forward to', 'с нетерпением ждать', 'I’m *looking forward to* the holidays.', 'Я с нетерпением жду каникул.', { note: 'look forward to + -ing: I look forward to hearing from you.', rule: 'to-preposition' }],
      ['B1', 'look up', 'искать (в словаре, в интернете)', '*Look up* the word in a dictionary.', 'Найди это слово в словаре.'],
      ['B1', 'look out', 'осторожно!, берегись', '*Look out*! There’s a car coming!', 'Осторожно! Машина!'],
      ['B2', 'look into', 'изучить, разобраться', 'We’ll *look into* the problem.', 'Мы разберёмся с этой проблемой.'],
      ['B2', 'look up to', 'уважать, равняться на', 'I’ve always *looked up to* my older brother.', 'Я всегда равнялся на старшего брата.'],
      ['B2', 'look down on', 'смотреть свысока', 'Don’t *look down on* people who earn less.', 'Не смотри свысока на тех, кто зарабатывает меньше.'],
      ['B2', 'look back', 'оглядываться назад, вспоминать', 'When I *look back*, I don’t regret anything.', 'Оглядываясь назад, я ни о чём не жалею.'],
    ],
  },
  {
    verb: 'come',
    ru: 'приходить',
    rows: [
      ['B1', 'come back', 'возвращаться', 'When are you *coming back*?', 'Когда ты вернёшься?'],
      ['B1', 'come in', 'входить', '*Come in* and sit down.', 'Заходи и садись.'],
      ['B1', 'come on', 'давай!, ну же!', '*Come on*, we’ll be late!', 'Давай быстрее, опоздаем!'],
      ['B1', 'come over', 'зайти в гости', 'Why don’t you *come over* tonight?', 'Может, зайдёшь сегодня вечером?'],
      ['B2', 'come up with', 'придумать (идею, план)', 'She *came up with* a brilliant idea.', 'Она придумала блестящую идею.'],
      ['B2', 'come across', 'случайно наткнуться', 'I *came across* an old photo of us.', 'Я наткнулся на нашу старую фотографию.'],
      ['B2', 'come up', 'возникать (о проблеме, теме)', 'Something *came up* at work, so I can’t come.', 'На работе кое-что возникло, поэтому я не смогу прийти.'],
      ['B2', 'come out', 'выходить (о книге, фильме)', 'Her new book *comes out* next month.', 'Её новая книга выходит в следующем месяце.'],
      ['B2', 'come down with', 'заболеть (простудой и т. п.)', 'I think I’m *coming down with* a cold.', 'Кажется, я заболеваю простудой.'],
    ],
  },
  {
    verb: 'go',
    ru: 'идти, ехать',
    rows: [
      ['B1', 'go on', 'продолжать; происходить', 'What’s *going on*?', 'Что происходит?', { note: 'go on + -ing = continue: Go on talking.' }],
      ['B1', 'go out', 'выходить (развлекаться)', 'Do you want to *go out* tonight?', 'Хочешь сходить куда-нибудь сегодня вечером?'],
      ['B1', 'go back', 'возвращаться', 'I never want to *go back* there.', 'Я никогда не хочу туда возвращаться.'],
      ['B1', 'go with', 'сочетаться, подходить', 'Does this tie *go with* my shirt?', 'Этот галстук подходит к моей рубашке?'],
      ['B1', 'go out with', 'встречаться (с кем-то)', 'How long have you been *going out with* him?', 'Как долго ты с ним встречаешься?'],
      ['B2', 'go through', 'переживать (трудности)', 'She’s *going through* a difficult time.', 'Она переживает трудный период.'],
      ['B2', 'go off', 'сработать (о будильнике); испортиться', 'My alarm didn’t *go off* this morning.', 'Мой будильник сегодня утром не сработал.'],
      ['B2', 'go over', 'просматривать, повторять', 'Let’s *go over* the plan once more.', 'Давай ещё раз пройдёмся по плану.'],
    ],
  },
  {
    verb: 'turn',
    ru: 'поворачивать',
    rows: [
      ['B1', 'turn on', 'включать', '*Turn on* the light, please.', 'Включи, пожалуйста, свет.'],
      ['B1', 'turn off', 'выключать', 'Don’t forget to *turn off* the oven.', 'Не забудь выключить духовку.'],
      ['B1', 'turn down', 'отклонить (предложение); убавить', 'She *turned down* the job offer.', 'Она отказалась от предложения о работе.'],
      ['B1', 'turn up', 'появиться, прийти', 'He *turned up* an hour late.', 'Он появился на час позже.', { note: 'Also: turn up the music = make it louder.' }],
      ['B2', 'turn out', 'оказаться', 'It *turned out* that he was right.', 'Оказалось, что он был прав.'],
      ['B2', 'turn into', 'превращаться', 'The argument *turned into* a big fight.', 'Спор превратился в большую ссору.'],
      ['B2', 'turn to', 'обращаться (за помощью)', 'She had no one to *turn to*.', 'Ей не к кому было обратиться.'],
    ],
  },
  {
    verb: 'give',
    ru: 'давать',
    rows: [
      ['B1', 'give up', 'бросить (привычку), сдаться', 'My dad *gave up* smoking last year.', 'Мой папа бросил курить в прошлом году.', { note: 'give up + -ing.', rule: 'verb-patterns' }],
      ['B1', 'give back', 'вернуть, отдать обратно', 'Can you *give* me *back* my book?', 'Можешь вернуть мне мою книгу?'],
      ['B2', 'give in', 'сдаться, уступить', 'Don’t *give in* to pressure.', 'Не поддавайся давлению.'],
      ['B2', 'give away', 'отдавать (бесплатно); выдавать (секрет)', 'She *gave away* all her old clothes.', 'Она раздала всю свою старую одежду.'],
      ['B2', 'give out', 'раздавать', 'The teacher *gave out* the tests.', 'Учитель раздал тесты.'],
    ],
  },
  {
    verb: 'break',
    ru: 'ломать',
    rows: [
      ['B1', 'break up', 'расстаться', 'They *broke up* after five years.', 'Они расстались после пяти лет.', { note: 'break up with someone.' }],
      ['B1', 'break down', 'сломаться (о машине); не выдержать', 'Our car *broke down* on the motorway.', 'Наша машина сломалась на трассе.', { note: 'Also about people: She broke down in tears.' }],
      ['B2', 'break into', 'вломиться', 'Someone *broke into* our flat.', 'Кто-то вломился в нашу квартиру.'],
      ['B2', 'break out', 'вспыхнуть (о пожаре, войне)', 'A fire *broke out* in the kitchen.', 'На кухне вспыхнул пожар.'],
    ],
  },
  {
    verb: 'make',
    ru: 'делать',
    rows: [
      ['B1', 'make up', 'помириться; придумать', 'They argued but *made up* the next day.', 'Они поссорились, но помирились на следующий день.', { note: 'Also: make up a story = invent it.' }],
      ['B2', 'make up for', 'возместить, загладить', 'How can I *make up for* my mistake?', 'Как мне загладить свою ошибку?'],
      ['B2', 'make out', 'разобрать (увидеть, услышать)', 'I can’t *make out* what he’s saying.', 'Не могу разобрать, что он говорит.'],
    ],
  },
  {
    verb: 'set',
    ru: 'ставить, устанавливать',
    rows: [
      ['B1', 'set off', 'отправиться (в путь)', 'We *set off* early in the morning.', 'Мы отправились в путь рано утром.'],
      ['B1', 'set up', 'основать, организовать', 'She *set up* her own business.', 'Она открыла собственный бизнес.'],
      ['B2', 'set out', 'излагать; начинать (с целью)', 'The report *sets out* the main problems.', 'В отчёте изложены основные проблемы.'],
    ],
  },
  {
    verb: 'run',
    ru: 'бежать',
    rows: [
      ['B1', 'run out of', 'закончиться (о запасе)', 'We’ve *run out of* milk.', 'У нас закончилось молоко.'],
      ['B1', 'run away', 'убежать, сбежать', 'He *ran away* from home at sixteen.', 'В шестнадцать лет он сбежал из дома.'],
      ['B2', 'run into', 'случайно встретить', 'I *ran into* an old friend at the station.', 'Я случайно встретил старого друга на вокзале.'],
    ],
  },
  {
    verb: 'work',
    ru: 'работать',
    rows: [
      ['B1', 'work out', 'наладиться, получиться; тренироваться', 'Don’t worry, everything will *work out*.', 'Не волнуйся, всё наладится.', { note: 'Also: I work out at the gym = I exercise.' }],
      ['B2', 'work on', 'работать над', 'I’m *working on* my self-confidence.', 'Я работаю над уверенностью в себе.'],
      ['B2', 'work through', 'проработать (проблему, чувства)', 'It takes time to *work through* your feelings.', 'Нужно время, чтобы проработать свои чувства.'],
    ],
  },
  {
    verb: 'let',
    ru: 'позволять',
    rows: [
      ['B1', 'let in', 'впустить', 'Don’t *let* anyone *in*.', 'Никого не впускай.'],
      ['B2', 'let down', 'подвести, разочаровать', 'I promised to help, and I won’t *let* you *down*.', 'Я обещал помочь и не подведу тебя.'],
      ['B2', 'let go', 'отпустить (прошлое, ситуацию)', 'Sometimes you have to *let go* of the past.', 'Иногда нужно отпустить прошлое.', { note: 'let go of something.' }],
    ],
  },
  {
    verb: 'fall',
    ru: 'падать',
    rows: [
      ['B2', 'fall out with', 'поссориться (с кем-то)', 'I *fell out with* my best friend.', 'Я поссорился с лучшим другом.'],
      ['B2', 'fall apart', 'развалиться', 'After the divorce, his life *fell apart*.', 'После развода его жизнь развалилась.'],
      ['B2', 'fall for', 'влюбиться; попасться (на уловку)', 'She *fell for* him the moment they met.', 'Она влюбилась в него с первой встречи.'],
      ['B2', 'fall behind', 'отставать', 'I *fell behind* with my work.', 'Я отстал с работой.'],
    ],
  },
  {
    verb: 'bring',
    ru: 'приносить',
    rows: [
      ['B1', 'bring back', 'вернуть; пробудить (воспоминания)', 'This song *brings back* memories.', 'Эта песня пробуждает воспоминания.'],
      ['B2', 'bring up', 'воспитывать; поднимать (тему)', 'She was *brought up* by her grandparents.', 'Её воспитали бабушка и дедушка.'],
      ['B2', 'bring about', 'вызывать, приводить к', 'Therapy can *bring about* real change.', 'Терапия может привести к настоящим переменам.'],
    ],
  },
  {
    verb: 'move',
    ru: 'двигаться',
    rows: [
      ['B1', 'move in', 'въехать, поселиться', 'We *moved in* last week.', 'Мы въехали на прошлой неделе.', { note: 'move in with someone = start living together.' }],
      ['B1', 'move out', 'съехать', 'My son *moved out* when he was twenty.', 'Мой сын съехал, когда ему было двадцать.'],
      ['B2', 'move on', 'двигаться дальше, отпустить', 'It’s time to *move on* and forget about him.', 'Пора двигаться дальше и забыть о нём.'],
    ],
  },
  {
    verb: 'call',
    ru: 'звонить; звать',
    rows: [
      ['B1', 'call back', 'перезвонить', 'I’ll *call* you *back* later.', 'Я перезвоню тебе позже.'],
      ['B2', 'call off', 'отменить', 'They *called off* the wedding.', 'Они отменили свадьбу.'],
    ],
  },
  {
    verb: 'hold',
    ru: 'держать',
    rows: [
      ['B1', 'hold on', 'подождать (минутку)', '*Hold on*, I’ll get a pen.', 'Подожди, я возьму ручку.'],
      ['B2', 'hold back', 'сдерживать (эмоции)', 'She couldn’t *hold back* her tears.', 'Она не смогла сдержать слёз.'],
    ],
  },
  {
    verb: 'show',
    ru: 'показывать',
    rows: [
      ['B1', 'show up', 'прийти, появиться', 'Only five people *showed up* to the meeting.', 'На встречу пришли всего пять человек.'],
      ['B2', 'show off', 'хвастаться, красоваться', 'Stop *showing off*!', 'Хватит выпендриваться!'],
    ],
  },
  {
    verb: 'check',
    ru: 'проверять',
    rows: [
      ['B1', 'check in', 'зарегистрироваться (в отеле, аэропорту)', 'We *checked in* at the hotel at three.', 'Мы заселились в отель в три.'],
      ['B1', 'check out', 'выселиться (из отеля); посмотреть', '*Check out* this video!', 'Посмотри это видео!'],
    ],
  },
  {
    verb: 'carry',
    ru: 'нести',
    rows: [
      ['B1', 'carry on', 'продолжать', '*Carry on*, I’m listening.', 'Продолжай, я слушаю.'],
      ['B2', 'carry out', 'проводить, выполнять', 'The survey was *carried out* last month.', 'Опрос провели в прошлом месяце.'],
    ],
  },
  {
    verb: 'cut',
    ru: 'резать',
    rows: [
      ['B2', 'cut down on', 'сократить (потребление)', 'I’m trying to *cut down on* sugar.', 'Я стараюсь есть меньше сахара.'],
      ['B2', 'cut off', 'прекратить (общение); отрезать', 'She *cut off* all contact with her ex.', 'Она прекратила всякое общение с бывшим.'],
    ],
  },
  {
    verb: 'pass',
    ru: 'проходить; передавать',
    rows: [
      ['B2', 'pass away', 'скончаться', 'Her grandfather *passed away* last year.', 'Её дедушка скончался в прошлом году.', { note: 'A gentle way to say “die”.' }],
      ['B2', 'pass on', 'передать (сообщение)', 'Could you *pass on* the message to Anna?', 'Не могли бы вы передать сообщение Анне?'],
    ],
  },
  { verb: 'pick', ru: 'подбирать', rows: [['B1', 'pick up', 'забрать (кого-то); поднять', 'I’ll *pick* you *up* at the airport.', 'Я заберу тебя из аэропорта.', { note: 'A pronoun goes in the middle: pick you up.', rule: 'phrasal-object' }]] },
  { verb: 'find', ru: 'находить', rows: [['B1', 'find out', 'узнать, выяснить', 'I need to *find out* when the train leaves.', 'Мне нужно выяснить, когда отходит поезд.']] },
  { verb: 'figure', ru: 'понимать', rows: [['B2', 'figure out', 'понять, разобраться', 'I can’t *figure out* how this works.', 'Не могу понять, как это работает.']] },
  { verb: 'calm', ru: 'успокаивать', rows: [['B1', 'calm down', 'успокоиться', '*Calm down* and tell me what happened.', 'Успокойся и расскажи, что случилось.']] },
  { verb: 'cheer', ru: 'подбадривать', rows: [['B1', 'cheer up', 'подбодрить; повеселеть', '*Cheer up*! It’s not the end of the world.', 'Выше нос! Это не конец света.']] },
  { verb: 'catch', ru: 'ловить', rows: [['B1', 'catch up', 'наверстать; пообщаться после перерыва', 'Let’s meet for coffee and *catch up*.', 'Давай встретимся за кофе и поболтаем обо всём.']] },
  { verb: 'deal', ru: 'иметь дело', rows: [['B1', 'deal with', 'справляться с; иметь дело с', 'How do you *deal with* stress?', 'Как ты справляешься со стрессом?']] },
  { verb: 'fill', ru: 'заполнять', rows: [['B1', 'fill in', 'заполнить (анкету)', 'Please *fill in* this form.', 'Пожалуйста, заполните эту анкету.']] },
  { verb: 'grow', ru: 'расти', rows: [['B1', 'grow up', 'вырасти, повзрослеть', 'I *grew up* in a small town.', 'Я вырос в маленьком городе.']] },
  { verb: 'wake', ru: 'будить', rows: [['B1', 'wake up', 'проснуться', 'I *woke up* in the middle of the night.', 'Я проснулся посреди ночи.']] },
  { verb: 'ask', ru: 'спрашивать', rows: [['B1', 'ask out', 'пригласить на свидание', 'He finally *asked* her *out*.', 'Наконец он пригласил её на свидание.', { rule: 'phrasal-object' }]] },
  { verb: 'split', ru: 'разделять', rows: [['B1', 'split up', 'расстаться', 'My parents *split up* when I was ten.', 'Мои родители расстались, когда мне было десять.']] },
  { verb: 'open', ru: 'открывать', rows: [['B2', 'open up', 'открыться, начать делиться чувствами', 'It took him months to *open up* to his therapist.', 'Ему понадобились месяцы, чтобы открыться психотерапевту.', { note: 'open up to someone.' }]] },
  { verb: 'bottle', ru: 'разливать в бутылки', rows: [['B2', 'bottle up', 'держать в себе (эмоции)', 'It isn’t healthy to *bottle up* your feelings.', 'Держать чувства в себе вредно.']] },
  { verb: 'reach', ru: 'дотягиваться', rows: [['B2', 'reach out', 'обратиться за поддержкой; протянуть руку помощи', 'Don’t be afraid to *reach out* when you need help.', 'Не бойся обращаться за помощью, когда она нужна.', { note: 'reach out to someone.' }]] },
  { verb: 'lash', ru: 'хлестать', rows: [['B2', 'lash out', 'сорваться, наброситься (на кого-то)', 'When he’s stressed, he *lashes out* at his family.', 'Когда он в стрессе, он срывается на семье.', { note: 'lash out at someone.' }]] },
  { verb: 'freak', ru: 'пугаться', rows: [['B2', 'freak out', 'психовать, паниковать', 'Don’t *freak out*, but I’ve lost your keys.', 'Только не психуй, но я потерял твои ключи.']] },
  { verb: 'burn', ru: 'гореть', rows: [['B2', 'burn out', 'выгореть', 'If you work twelve hours a day, you’ll *burn out*.', 'Если работать по двенадцать часов в день, выгоришь.']] },
  { verb: 'speak', ru: 'говорить', rows: [['B2', 'speak up', 'высказаться; говорить громче', 'If something bothers you, *speak up*.', 'Если тебя что-то беспокоит, скажи об этом.']] },
  { verb: 'stand', ru: 'стоять', rows: [['B2', 'stand up for', 'отстаивать, заступаться', 'You need to *stand up for* yourself.', 'Тебе нужно научиться постоять за себя.']] },
  { verb: 'back', ru: 'отступать', rows: [['B2', 'back off', 'отступить, отстать', 'He *backed off* when he saw she was upset.', 'Он отступил, когда увидел, что она расстроена.']] },
  { verb: 'settle', ru: 'поселиться; улаживать', rows: [['B2', 'settle down', 'остепениться; успокоиться', 'They want to *settle down* and have kids.', 'Они хотят остепениться и завести детей.']] },
  { verb: 'sort', ru: 'сортировать', rows: [['B2', 'sort out', 'уладить, разобраться', 'We need to *sort out* this problem today.', 'Нам нужно решить эту проблему сегодня.']] },
  { verb: 'end', ru: 'заканчивать', rows: [['B2', 'end up', 'в итоге оказаться', 'We *ended up* staying at home.', 'В итоге мы остались дома.', { note: 'end up + -ing.' }]] },
  { verb: 'point', ru: 'указывать', rows: [['B2', 'point out', 'указать (на что-то), заметить', 'She politely *pointed out* my mistake.', 'Она вежливо указала на мою ошибку.']] },
];

export interface Family {
  verb: string;
  ru: string;
  items: VocabItem[];
}

export const FAMILIES: Family[] = SOURCES.map(({ verb, ru, rows }) => ({
  verb,
  ru,
  items: rows.map(([level, en, ruText, ex, exRu, extra]) => ({
    id: `${level.toLowerCase()}-${slug(en)}`,
    kind: 'word',
    en,
    ru: ruText,
    level,
    pos: 'phr v',
    ex,
    exRu,
    family: verb,
    ...extra,
  })),
}));

export const PHRASAL: VocabItem[] = FAMILIES.flatMap((f) => f.items);
