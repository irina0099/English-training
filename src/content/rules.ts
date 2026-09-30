import type { Level, Rule } from '../types';
import { RULES_EN } from './rules-en';

interface RuleRu {
  id: string;
  title: string;
  level: Level;
  summary: string;
  points: string[];
  examples: [string, string?][];
}

/** Russian texts; the English versions live in rules-en.ts. */
const RULES_RU: RuleRu[] = [
  {
    id: 'prep-time',
    title: 'Предлоги времени: at / on / in',
    level: 'B1',
    summary:
      'at — точное время (at 5 pm, at night); on — дни и даты (on Monday, on 5 May); in — месяцы, годы, сезоны и части дня (in May, in 2020, in the morning).',
    points: [
      'at + время суток и праздники: at 7 o’clock, at noon, at night, at Christmas, at the weekend (BrE).',
      'on + день или дата: on Friday, on my birthday, on 1st June, on Monday morning.',
      'in + более длинный период: in July, in summer, in 1999, in the evening, in two weeks (через две недели).',
      'Без предлога перед this, next, last, every: next week, last year, every Monday.',
    ],
    examples: [
      ['I’ll see you on Monday.', 'I’ll see you in Monday.'],
      ['She was born in 1995.', 'She was born at 1995.'],
      ['The lesson starts at 10 a.m.', 'The lesson starts in 10 a.m.'],
      ['We’re leaving next week.', 'We’re leaving on next week.'],
    ],
  },
  {
    id: 'prep-place',
    title: 'Предлоги места: at / on / in',
    level: 'B1',
    summary:
      'in — внутри (in the room, in London); on — на поверхности (on the table, on the wall); at — в точке, где что-то происходит (at the bus stop, at work, at home).',
    points: [
      'at home, at work, at school, at university, at a party, at the airport.',
      'in a car и in a taxi, но on a bus, on a train, on a plane.',
      'on the left / on the right, on the first floor.',
      'arrive in + город или страна (arrive in Paris), arrive at + здание или место (arrive at the hotel). Никогда не arrive to.',
    ],
    examples: [
      ['She’s at work now.', 'She’s on work now.'],
      ['There’s a clock on the wall.', 'There’s a clock in the wall.'],
      ['We arrived in Rome at midnight.', 'We arrived to Rome at midnight.'],
    ],
  },
  {
    id: 'articles',
    title: 'Артикли: a / an, the и без артикля',
    level: 'B1',
    summary:
      'a/an — «один из», упоминаем впервые или называем профессию; the — конкретный, понятно какой; без артикля — неисчисляемое или множественное число в общем смысле.',
    points: [
      'a перед согласным звуком, an перед гласным звуком: a university [ju:], an hour [aʊə].',
      'Профессия и «кто это»: She’s a doctor. It’s a good idea.',
      'the — единственное в своём роде или уже известное: the sun, the internet, the book I told you about.',
      'Без артикля — о чём-то в целом: I like music. Life is short. Dogs are clever.',
    ],
    examples: [
      ['My sister is a nurse.', 'My sister is nurse.'],
      ['It’s a university in the centre.', 'It’s an university in the centre.'],
      ['Life is too short.', 'The life is too short.'],
    ],
  },
  {
    id: 'present-perfect',
    title: 'Present Perfect или Past Simple',
    level: 'B1',
    summary:
      'Past Simple — когда есть время в прошлом (yesterday, in 2019, two days ago). Present Perfect — опыт или результат к настоящему без точного времени (ever, never, already, yet, just).',
    points: [
      'С ago, yesterday, last week, in 2010 и вопросом When…? — только Past Simple.',
      'С ever, never, already, yet, just, so far, this week — обычно Present Perfect.',
      'Present Perfect = have/has + третья форма глагола: I have seen, she has gone.',
      'Действие началось в прошлом и продолжается сейчас: I have lived here since 2018 (не I live here since…).',
    ],
    examples: [
      ['I saw him two days ago.', 'I have seen him two days ago.'],
      ['Did you see him yesterday?', 'Have you seen him yesterday?'],
      ['I’ve lived here since 2018.', 'I live here since 2018.'],
    ],
  },
  {
    id: 'for-since',
    title: 'for и since',
    level: 'B1',
    summary:
      'for + отрезок времени (for two years, for an hour), since + точка отсчёта (since 2020, since Monday, since I was a child).',
    points: [
      'Обычно с Present Perfect: I’ve known her for ten years / since 2015.',
      'Вопрос: How long have you…? — ответ с for или since.',
      'from … to … — «с … по …» для периода с началом и концом: from 9 to 5.',
    ],
    examples: [
      ['I’ve worked here for three years.', 'I’ve worked here since three years.'],
      ['We’ve been friends since school.', 'We’ve been friends from school.'],
    ],
  },
  {
    id: 'make-do',
    title: 'make или do',
    level: 'B1',
    summary:
      'do — действия, работа и обязанности (do homework, do the shopping, do a favour); make — создаём результат (make a cake, make a decision, make a mistake, make money).',
    points: [
      'do: homework, housework, the shopping, the washing-up, exercise, business, your best, a favour.',
      'make: a mistake, a decision, a plan, money, a noise, friends, an effort, a phone call, breakfast.',
      'Спросите себя: появляется ли новый результат? Да — чаще make.',
    ],
    examples: [
      ['I made a mistake.', 'I did a mistake.'],
      ['Could you do me a favour?', 'Could you make me a favour?'],
      ['I need to do my homework.', 'I need to make my homework.'],
    ],
  },
  {
    id: 'verb-patterns',
    title: 'Глагол + -ing или to + глагол',
    level: 'B1',
    summary:
      'После enjoy, finish, mind, avoid, suggest, consider, deny — форма -ing. После want, decide, hope, plan, agree, manage, afford, offer — to + глагол.',
    points: [
      '+ -ing: enjoy, finish, mind, avoid, suggest, consider, keep, can’t stand, deny, involve, be worth.',
      '+ to: want, decide, hope, plan, agree, manage, afford, offer, refuse, promise, tend.',
      'После любого предлога — только -ing: good at swimming, interested in learning, instead of waiting.',
      'suggest + -ing или suggest that…, но не suggest someone to do.',
    ],
    examples: [
      ['I enjoy cooking.', 'I enjoy to cook.'],
      ['We decided to leave early.', 'We decided leaving early.'],
      ['She suggested going out.', 'She suggested to go out.'],
      ['The film is worth seeing.', 'The film is worth to see.'],
    ],
  },
  {
    id: 'to-preposition',
    title: 'to как предлог: look forward to + -ing',
    level: 'B1',
    summary:
      'В выражениях look forward to, be used to, get used to, object to частица to — это предлог, поэтому дальше идёт -ing или существительное: I look forward to hearing from you.',
    points: [
      'look forward to seeing you (жду встречи).',
      'be used to working late (привык), get used to driving on the left (привыкнуть).',
      'Проверка: если после to можно поставить существительное (look forward to the weekend), то глагол будет с -ing.',
    ],
    examples: [
      ['I’m looking forward to meeting you.', 'I’m looking forward to meet you.'],
      ['I’m used to getting up early.', 'I’m used to get up early.'],
    ],
  },
  {
    id: 'used-to',
    title: 'used to / be used to / get used to',
    level: 'B2',
    summary:
      'used to + глагол — «раньше (а теперь нет)»: I used to smoke. be used to + -ing — «привык»: I’m used to working at night. get used to + -ing — «привыкнуть».',
    points: [
      'used to do — привычка или состояние в прошлом: We used to live in Kazan.',
      'Отрицание и вопрос: didn’t use to, Did you use to…? (без d).',
      'be used to + -ing или существительное — уже привык: She’s used to the noise.',
      'get used to + -ing — процесс привыкания: You’ll get used to it.',
    ],
    examples: [
      ['I used to play the piano.', 'I was used to play the piano.'],
      ['She’s used to working late.', 'She’s used to work late.'],
      ['Did you use to live here?', 'Did you used to live here?'],
    ],
  },
  {
    id: 'dep-prep',
    title: 'Устойчивые предлоги после слов',
    level: 'B1',
    summary:
      'Многие глаголы и прилагательные требуют «своего» предлога, и он часто не совпадает с русским: depend on (зависеть от), afraid of, interested in, good at, listen to, wait for.',
    points: [
      'on: depend on, rely on, insist on, concentrate on, spend money on.',
      'in: interested in, succeed in, believe in.',
      'at: good at, bad at, surprised at.',
      'of: afraid of, proud of, tired of, consist of.',
      'for: wait for, pay for, responsible for, apologise for.',
      'to: listen to, belong to, contribute to, married to. about: worried about, complain about.',
      'Без предлога: discuss something, enter a room, answer a question, call someone.',
    ],
    examples: [
      ['It depends on the weather.', 'It depends of the weather.'],
      ['I’m interested in history.', 'I’m interested of history.'],
      ['We’re waiting for the bus.', 'We’re waiting the bus.'],
      ['Listen to me!', 'Listen me!'],
    ],
  },
  {
    id: 'agree',
    title: 'I agree, а не I am agree',
    level: 'B1',
    summary:
      'agree — это глагол, поэтому без am/is/are: I agree, I don’t agree. Сравните: I’m sure, I’m right — там прилагательные, и глагол be нужен.',
    points: [
      'agree with someone / with an idea: I agree with you.',
      'agree to do something — согласиться сделать: He agreed to help.',
      'agree on something — договориться о чём-то: We agreed on the price.',
      'Отрицание: I don’t agree (не I’m not agree).',
    ],
    examples: [
      ['I agree with you.', 'I am agree with you.'],
      ['I don’t agree with him.', 'I’m not agree with him.'],
    ],
  },
  {
    id: 'say-tell',
    title: 'say, tell, explain',
    level: 'B1',
    summary:
      'tell + кому (tell me, tell her), say + что (say hello) или say to someone. explain, describe, suggest — something TO someone: explain it to me, а не explain me.',
    points: [
      'tell someone something: She told me the news.',
      'say something (to someone): He said goodbye to us. He said (that) he was tired.',
      'Устойчивые сочетания с tell: tell the truth, tell a lie, tell a story, tell the time.',
      'explain / describe / suggest something to someone: Can you explain this to me?',
    ],
    examples: [
      ['Can you explain this word to me?', 'Can you explain me this word?'],
      ['She told me about it.', 'She said me about it.'],
      ['He said that he was busy.', 'He told that he was busy.'],
    ],
  },
  {
    id: 'false-friends',
    title: 'Ложные друзья переводчика',
    level: 'B1',
    summary:
      'Слова похожи на русские, но значат другое: magazine — журнал (магазин = shop), actually — на самом деле (актуальный = relevant), sympathetic — сочувствующий (симпатичный = nice), accurate — точный (аккуратный = neat).',
    points: [
      'magazine — журнал; магазин — shop, store.',
      'actual / actually — фактический / на самом деле; актуальный — relevant, up to date.',
      'sympathetic — сочувствующий; симпатичный — nice, good-looking.',
      'accurate — точный; аккуратный — neat, tidy, careful.',
      'fabric — ткань; фабрика — factory.',
      'decade — десятилетие; декада (десять дней) — ten days.',
      'sensible — разумный; чувствительный — sensitive.',
      'eventually — в конце концов; возможно — possibly.',
      'familiar — знакомый; фамильярный — too informal.',
    ],
    examples: [
      ['I bought a magazine at the shop.', 'I bought a magazine at the magazine.'],
      ['This information is no longer relevant.', 'This information is no longer actual.'],
      ['My dad worked at a car factory.', 'My dad worked at a car fabric.'],
    ],
  },
  {
    id: 'countable',
    title: 'Исчисляемые и неисчисляемые',
    level: 'B1',
    summary:
      'advice, information, news, furniture, luggage, equipment, weather, traffic, knowledge — неисчисляемые: без a/an и без -s. Нужна «одна штука» — a piece of: a piece of advice.',
    points: [
      'much + неисчисляемое (much time), many + исчисляемое (many people). a lot of — для обоих.',
      'news — всегда единственное число: The news is good.',
      'Нельзя: an advice, informations, furnitures, luggages.',
      'some и any подходят к обоим: some advice, some apples.',
    ],
    examples: [
      ['Can I give you some advice?', 'Can I give you an advice?'],
      ['The news is good.', 'The news are good.'],
      ['How much luggage do you have?', 'How many luggages do you have?'],
    ],
  },
  {
    id: 'conditionals',
    title: 'Условные предложения: if + will / would',
    level: 'B1',
    summary:
      'После if и when (о будущем) не ставим will: If it rains, we’ll stay home. Нереальное условие: if + Past Simple, would + глагол: If I had time, I would help.',
    points: [
      'Реальное: If + Present Simple, will + глагол. If you hurry, you’ll catch the bus.',
      'То же после when, as soon as, before, until: I’ll call you when I get home.',
      'Нереальное сейчас: If + Past Simple, would + глагол. If I were you, I’d go.',
      'Нереальное в прошлом (B2): If + had done, would have done. If I had known, I would have come.',
    ],
    examples: [
      ['If it rains, we’ll stay at home.', 'If it will rain, we’ll stay at home.'],
      ['If I had more money, I would travel.', 'If I would have more money, I would travel.'],
      ['I’ll call you when I get home.', 'I’ll call you when I will get home.'],
    ],
  },
  {
    id: 'ed-ing',
    title: 'Прилагательные на -ed и -ing',
    level: 'B1',
    summary:
      '-ed — что чувствует человек (I’m bored, interested, tired). -ing — какой предмет или ситуация, то есть что вызывает чувство (the film is boring, interesting, tiring).',
    points: [
      'bored / boring, interested / interesting, tired / tiring, surprised / surprising, exhausted / exhausting.',
      'I’m boring = «я скучный человек», а не «мне скучно».',
    ],
    examples: [
      ['I’m interested in history.', 'I’m interesting in history.'],
      ['The lecture was boring, so I was bored.', 'The lecture was bored, so I was boring.'],
    ],
  },
  {
    id: 'questions',
    title: 'Порядок слов в вопросах',
    level: 'B1',
    summary:
      'В прямом вопросе вспомогательный глагол стоит перед подлежащим: Where do you live? В косвенном вопросе (Could you tell me…, Do you know…) — обычный порядок: Could you tell me where the station is?',
    points: [
      'Прямой: вопросительное слово + do/does/did/is/can + подлежащее + глагол: What did you do?',
      'Косвенный: Do you know / Could you tell me / I wonder + вопросительное слово + подлежащее + глагол.',
      'В косвенном вопросе нет do/does/did: Do you know where she lives? (не where does she live).',
    ],
    examples: [
      ['Where do you work?', 'Where you work?'],
      ['Could you tell me where the station is?', 'Could you tell me where is the station?'],
      ['Do you know what time it is?', 'Do you know what time is it?'],
    ],
  },
  {
    id: 'modals',
    title: 'must, have to, mustn’t, don’t have to',
    level: 'B2',
    summary:
      'must / have to — нужно, обязательно. mustn’t — нельзя, запрещено. don’t have to — не обязательно, можно не делать.',
    points: [
      'must — чаще личное решение или правило на табличке; have to — обстоятельства: I have to work on Saturday.',
      'После must и других модальных — глагол без to: must go (не must to go).',
      'В прошлом у must нет формы, используйте had to: I had to wait.',
    ],
    examples: [
      ['You mustn’t smoke here. (It isn’t allowed.)'],
      ['You don’t have to come if you’re busy. (You can stay at home.)'],
      ['I must go now.', 'I must to go now.'],
    ],
  },
  {
    id: 'wish',
    title: 'wish: сожаление о настоящем и прошлом',
    level: 'B2',
    summary:
      'wish + Past Simple — жаль, что сейчас не так (I wish I knew). wish + Past Perfect — жаль, что так вышло в прошлом (I wish I hadn’t said that). wish + would — хочу, чтобы кто-то изменил поведение.',
    points: [
      'I wish I had more free time. (сейчас времени нет)',
      'I wish I were taller. — were для всех лиц (в разговоре допустимо was).',
      'I wish I had studied harder. (в прошлом не учился)',
      'I wish you would stop interrupting me. (раздражает поведение)',
    ],
    examples: [
      ['I wish I knew the answer.', 'I wish I know the answer.'],
      ['I wish I hadn’t eaten so much.', 'I wish I haven’t eaten so much.'],
    ],
  },
  {
    id: 'passive',
    title: 'Пассивный залог',
    level: 'B2',
    summary:
      'be + третья форма глагола, когда важно действие, а не кто его совершил: The bridge was built in 1900. Время показывает форма be: is made, was made, is being made, has been made.',
    points: [
      'Present: English is spoken here. Past: The house was sold.',
      'Continuous: The room is being cleaned. Perfect: The tickets have been booked.',
      'Кто сделал — через by: The book was written by Tolstoy.',
    ],
    examples: [
      ['The house was built in 1920.', 'The house built in 1920.'],
      ['English is spoken all over the world.', 'English speaks all over the world.'],
    ],
  },
  {
    id: 'reported',
    title: 'Косвенная речь',
    level: 'B2',
    summary:
      'Пересказывая чужие слова после said / told / asked, время обычно сдвигается на шаг в прошлое (will → would, can → could), а в пересказанном вопросе порядок слов прямой: She asked where I worked.',
    points: [
      '“I’m tired” → She said (that) she was tired.',
      '“I’ll call you” → He said he would call me.',
      'Вопрос: “Where do you work?” → She asked me where I worked (без did).',
      'Вопрос «да/нет»: “Are you ready?” → He asked if / whether I was ready.',
      'Если сказанное всё ещё верно, сдвиг можно не делать: She said she lives in Kazan.',
    ],
    examples: [
      ['She asked me where I worked.', 'She asked me where did I work.'],
      ['He asked if I was ready.', 'He asked am I ready.'],
    ],
  },
  {
    id: 'comparatives',
    title: 'Сравнительная и превосходная степень',
    level: 'B1',
    summary:
      'Короткие прилагательные: -er / the -est (cheaper, the cheapest). Длинные: more / the most (more expensive). Сравниваем с помощью than. Исключения: good — better — the best, bad — worse — the worst.',
    points: [
      'Односложные: cheap → cheaper → the cheapest; big → bigger (удвоение согласной).',
      'На -y: easy → easier → the easiest.',
      'Длинные: comfortable → more comfortable → the most comfortable.',
      'Усиление: much / a lot / far better (не very better).',
    ],
    examples: [
      ['This phone is cheaper than that one.', 'This phone is more cheap than that one.'],
      ['It’s the best film I’ve ever seen.', 'It’s the most good film I’ve ever seen.'],
      ['Your English is much better now.', 'Your English is very better now.'],
    ],
  },
  {
    id: 'phrasal-object',
    title: 'Фразовые глаголы: куда ставить дополнение',
    level: 'B1',
    summary:
      'У многих фразовых глаголов существительное может стоять до или после частицы (pick up the kids / pick the kids up), но местоимение — только посередине: pick them up, а не pick up them.',
    points: [
      'Разделяемые: pick up, turn on/off, put on, take off, give back, let down, call back, ask out.',
      'Существительное: turn off the TV = turn the TV off. Местоимение: turn it off (не turn off it).',
      'Неразделяемые (с предлогом): look after, look for, get over, deal with — дополнение всегда после: look after them.',
    ],
    examples: [
      ['I dropped my keys and picked them up.', 'I dropped my keys and picked up them.'],
      ['Can you turn it off?', 'Can you turn off it?'],
      ['She looks after her grandmother.', 'She looks her grandmother after.'],
    ],
  },
  {
    id: 'future',
    title: 'Будущее: will, be going to, Present Continuous',
    level: 'B1',
    summary:
      'will — решение в момент речи, обещание, прогноз-мнение. be going to — план или то, что вот-вот случится по признакам. Present Continuous — договорённость с временем и местом.',
    points: [
      'will: — The phone’s ringing. — I’ll answer it. I’ll help you. I think it will rain.',
      'be going to: I’m going to learn Spanish (план). Look at the clouds — it’s going to rain (есть признаки).',
      'Present Continuous: I’m meeting Anna at six tomorrow (уже договорились).',
      'После when, if, before, until о будущем — Present Simple: when I get home.',
    ],
    examples: [
      ['Look at those clouds! It’s going to rain.', 'Look at those clouds! It rains.'],
      ['I’m seeing the dentist at 4 tomorrow.', 'I see the dentist at 4 tomorrow.'],
      ['— It’s cold. — I’ll close the window.', '— It’s cold. — I close the window.'],
    ],
  },
  {
    id: 'past-continuous',
    title: 'Past Continuous и Past Simple',
    level: 'B1',
    summary:
      'Past Continuous (was/were + -ing) — процесс в прошлом, фон. Past Simple — короткое действие, которое его прервало: I was having a shower when the phone rang.',
    points: [
      'was/were + глагол с -ing: I was reading, they were talking.',
      'when + Past Simple (короткое событие), while + Past Continuous (процесс).',
      'Два одновременных процесса: While I was cooking, he was watching TV.',
      'Глаголы состояния (know, like, want) обычно не ставят в Continuous.',
    ],
    examples: [
      ['I was having a shower when the phone rang.', 'I had a shower when the phone was ringing.'],
      ['What were you doing at 8 last night?', 'What did you doing at 8 last night?'],
    ],
  },
  {
    id: 'relative',
    title: 'who, which, that, where, whose',
    level: 'B1',
    summary:
      'who (или that) — о людях, which (или that) — о вещах, where — о месте, whose — «чей»: the man who lives next door, the book that you gave me, the café where we met.',
    points: [
      'who — люди: the woman who helped me.',
      'which — вещи и животные: the phone which I bought.',
      'that — вместо who или which в разговорной речи.',
      'where — место: the town where I grew up. whose — принадлежность: a friend whose sister is a doctor.',
    ],
    examples: [
      ['The man who lives next door is a doctor.', 'The man which lives next door is a doctor.'],
      ['This is the café where we met.', 'This is the café which we met.'],
      ['I have a friend whose brother is a pilot.', 'I have a friend who brother is a pilot.'],
    ],
  },
  {
    id: 'too-enough',
    title: 'too и enough',
    level: 'B1',
    summary:
      'too + прилагательное — «слишком» (too hot to drink). Прилагательное + enough — «достаточно» (old enough to drive). enough + существительное (enough time).',
    points: [
      'too стоит перед прилагательным: too expensive, too tired.',
      'enough стоит после прилагательного, но перед существительным: tall enough, enough money.',
      'Часто дальше идёт to + глагол: too young to vote, fast enough to win.',
    ],
    examples: [
      ['This coffee is too hot to drink.', 'This coffee is enough hot to drink.'],
      ['She isn’t tall enough to reach the shelf.', 'She isn’t enough tall to reach the shelf.'],
    ],
  },
  {
    id: 'quantifiers',
    title: 'few / a few, little / a little',
    level: 'B1',
    summary:
      'few и a few — с исчисляемыми (friends), little и a little — с неисчисляемыми (time, milk). С a — «немного, есть», без a — «мало, почти нет».',
    points: [
      'a few friends — несколько друзей (и это хорошо).',
      'few friends — мало друзей (почти нет).',
      'a little time — немного времени есть; little time — времени мало.',
      'В разговоре чаще говорят not many / not much вместо few / little.',
    ],
    examples: [
      ['There’s a little milk left.', 'There’s a few milk left.'],
      ['I have a few close friends.', 'I have a little close friends.'],
    ],
  },
  {
    id: 'so-such',
    title: 'so и such',
    level: 'B2',
    summary:
      'so + прилагательное или наречие (so tired, so quickly), such + (a/an) + прилагательное + существительное (such a nice day, such kind people).',
    points: [
      'so beautiful, so fast, so much, so many.',
      'such a good film, such an old house, such nice weather (неисчисляемое — без a).',
      'Результат через that: It was so cold that we stayed at home.',
    ],
    examples: [
      ['It was such a nice day that we went to the beach.', 'It was so nice day that we went to the beach.'],
      ['The film was so boring that I left.', 'The film was such boring that I left.'],
    ],
  },
  {
    id: 'modal-deduction',
    title: 'must be, can’t be, might be: догадки',
    level: 'B2',
    summary:
      'must be — почти уверен, что да. can’t be — почти уверен, что нет. might / may / could be — возможно. О прошлом: must have been, can’t have been.',
    points: [
      'She’s been working all day. She must be tired.',
      'That can’t be Tom — he’s in London. (не mustn’t be)',
      'I’m not sure where she is. She might be at the gym.',
      'О прошлом: That must have been hard. He can’t have seen us.',
    ],
    examples: [
      ['He can’t be at home — his car isn’t there.', 'He mustn’t be at home — his car isn’t there.'],
      ['You must be exhausted after the trip.', 'You can be exhausted after the trip.'],
    ],
  },
  {
    id: 'past-perfect',
    title: 'Past Perfect',
    level: 'B2',
    summary:
      'had + третья форма — действие, которое случилось раньше другого действия в прошлом: When we arrived, the film had already started.',
    points: [
      'had + past participle: had gone, had seen, had eaten.',
      'Часто с already, just, never, by the time, before.',
      'Если порядок и так ясен (after, before), можно и Past Simple.',
    ],
    examples: [
      ['When we arrived, the film had already started.', 'When we arrived, the film has already started.'],
      ['She was nervous because she had never flown before.', 'She was nervous because she has never flown before.'],
    ],
  },
];

export const RULES: Rule[] = RULES_RU.map(({ id, level, examples, title, summary, points }) => {
  const en = RULES_EN[id];
  if (!en) throw new Error(`Missing English text for rule ${id}`);
  return { id, level, examples, ...en, ru: { title, summary, points } };
});

export const RULES_BY_ID: Record<string, Rule> = Object.fromEntries(RULES.map((r) => [r.id, r]));
