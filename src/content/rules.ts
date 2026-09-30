import type { Rule } from '../types';

export const RULES: Rule[] = [
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
      ['You mustn’t smoke here. — Здесь курить нельзя.'],
      ['You don’t have to come if you’re busy. — Можешь не приходить, если занят.'],
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
];

export const RULES_BY_ID: Record<string, Rule> = Object.fromEntries(RULES.map((r) => [r.id, r]));
