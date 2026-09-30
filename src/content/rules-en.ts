/** English versions of the grammar rules, written in simple B1-level English. */
export const RULES_EN: Record<string, { title: string; summary: string; points: string[] }> = {
  'prep-time': {
    title: 'Prepositions of time: at / on / in',
    summary: 'at for exact times (at 5 pm, at night), on for days and dates (on Monday, on 5 May), in for months, years, seasons and parts of the day (in May, in 2020, in the morning).',
    points: [
      'at + clock times and holidays: at 7 o’clock, at noon, at night, at Christmas, at the weekend (BrE).',
      'on + a day or a date: on Friday, on my birthday, on 1st June, on Monday morning.',
      'in + a longer period: in July, in summer, in 1999, in the evening, in two weeks (= two weeks from now).',
      'No preposition before this, next, last, every: next week, last year, every Monday.',
    ],
  },
  'prep-place': {
    title: 'Prepositions of place: at / on / in',
    summary: 'in means inside (in the room, in London), on means on a surface (on the table, on the wall), at means at a point or a place where something happens (at the bus stop, at work, at home).',
    points: [
      'at home, at work, at school, at university, at a party, at the airport.',
      'in a car and in a taxi, but on a bus, on a train, on a plane.',
      'on the left / on the right, on the first floor.',
      'arrive in + a city or country (arrive in Paris), arrive at + a building or place (arrive at the hotel). Never arrive to.',
    ],
  },
  articles: {
    title: 'Articles: a / an, the, or no article',
    summary: 'a/an means “one of many”: first mention or a job. the means a specific thing we both know. No article for uncountable nouns and plurals in general.',
    points: [
      'a before a consonant sound, an before a vowel sound: a university [ju:], an hour [aʊə].',
      'Jobs and “what it is”: She’s a doctor. It’s a good idea.',
      'the for unique or known things: the sun, the internet, the book I told you about.',
      'No article when you talk in general: I like music. Life is short. Dogs are clever.',
    ],
  },
  'present-perfect': {
    title: 'Present Perfect or Past Simple',
    summary: 'Past Simple when there is a finished time (yesterday, in 2019, two days ago). Present Perfect for experience or a result now, with no exact time (ever, never, already, yet, just).',
    points: [
      'With ago, yesterday, last week, in 2010 and the question When…? — only Past Simple.',
      'With ever, never, already, yet, just, so far, this week — usually Present Perfect.',
      'Present Perfect = have/has + past participle: I have seen, she has gone.',
      'An action that started in the past and continues now: I have lived here since 2018 (not I live here since…).',
    ],
  },
  'for-since': {
    title: 'for and since',
    summary: 'for + a period of time (for two years, for an hour), since + a starting point (since 2020, since Monday, since I was a child).',
    points: [
      'Usually with Present Perfect: I’ve known her for ten years / since 2015.',
      'The question How long have you…? is answered with for or since.',
      'from … to … is for a period with a start and an end: from 9 to 5.',
    ],
  },
  'make-do': {
    title: 'make or do',
    summary: 'do for actions, work and duties (do homework, do the shopping, do a favour). make when you create a result (make a cake, make a decision, make a mistake, make money).',
    points: [
      'do: homework, housework, the shopping, the washing-up, exercise, business, your best, a favour.',
      'make: a mistake, a decision, a plan, money, a noise, friends, an effort, a phone call, breakfast.',
      'Ask yourself: is there a new result? If yes, it is usually make.',
    ],
  },
  'verb-patterns': {
    title: 'Verb + -ing or to + verb',
    summary: 'After enjoy, finish, mind, avoid, suggest, consider, deny use -ing. After want, decide, hope, plan, agree, manage, afford, offer use to + verb.',
    points: [
      '+ -ing: enjoy, finish, mind, avoid, suggest, consider, keep, can’t stand, deny, involve, be worth.',
      '+ to: want, decide, hope, plan, agree, manage, afford, offer, refuse, promise, tend.',
      'After any preposition, use -ing: good at swimming, interested in learning, instead of waiting.',
      'suggest + -ing or suggest that…, but never suggest someone to do.',
    ],
  },
  'to-preposition': {
    title: 'to as a preposition: look forward to + -ing',
    summary: 'In look forward to, be used to, get used to and object to, the word to is a preposition, so it is followed by -ing or a noun: I look forward to hearing from you.',
    points: [
      'look forward to seeing you.',
      'be used to working late (already normal for you), get used to driving on the left (becoming normal).',
      'Test: if you can put a noun after to (look forward to the weekend), the verb takes -ing.',
    ],
  },
  'used-to': {
    title: 'used to / be used to / get used to',
    summary: 'used to + verb means “in the past, but not now”: I used to smoke. be used to + -ing means “it is normal for me”: I’m used to working at night. get used to + -ing means “it is becoming normal”.',
    points: [
      'used to do — a past habit or state: We used to live in Kazan.',
      'Negative and question: didn’t use to, Did you use to…? (no d).',
      'be used to + -ing or a noun — already normal: She’s used to the noise.',
      'get used to + -ing — the process of getting used: You’ll get used to it.',
    ],
  },
  'dep-prep': {
    title: 'Prepositions after words',
    summary: 'Many verbs and adjectives take their own preposition, and it is often different from Russian: depend on, afraid of, interested in, good at, listen to, wait for.',
    points: [
      'on: depend on, rely on, insist on, concentrate on, spend money on.',
      'in: interested in, succeed in, believe in.',
      'at: good at, bad at, surprised at.',
      'of: afraid of, proud of, tired of, consist of.',
      'for: wait for, pay for, responsible for, apologise for.',
      'to: listen to, belong to, contribute to, married to. about: worried about, complain about.',
      'No preposition: discuss something, enter a room, answer a question, call someone.',
    ],
  },
  agree: {
    title: 'I agree, not I am agree',
    summary: 'agree is a verb, so there is no am/is/are: I agree, I don’t agree. Compare: I’m sure, I’m right — these are adjectives, so they need be.',
    points: [
      'agree with someone / with an idea: I agree with you.',
      'agree to do something: He agreed to help.',
      'agree on something — reach a decision together: We agreed on the price.',
      'Negative: I don’t agree (not I’m not agree).',
    ],
  },
  'say-tell': {
    title: 'say, tell, explain',
    summary: 'tell + a person (tell me, tell her), say + words (say hello) or say to someone. explain, describe and suggest take something TO someone: explain it to me, not explain me.',
    points: [
      'tell someone something: She told me the news.',
      'say something (to someone): He said goodbye to us. He said (that) he was tired.',
      'Fixed phrases with tell: tell the truth, tell a lie, tell a story, tell the time.',
      'explain / describe / suggest something to someone: Can you explain this to me?',
    ],
  },
  'false-friends': {
    title: 'False friends',
    summary: 'These words look like Russian words but mean something else: magazine (журнал), actually (на самом деле), sympathetic (сочувствующий), accurate (точный).',
    points: [
      'magazine = журнал; a shop or store = магазин.',
      'actual / actually = real / in fact; relevant or up to date = актуальный.',
      'sympathetic = showing you understand someone’s problem; nice or good-looking = симпатичный.',
      'accurate = exact, correct; neat or tidy = аккуратный.',
      'fabric = material for clothes; a factory = фабрика.',
      'decade = ten years (not ten days).',
      'sensible = reasonable; sensitive = чувствительный.',
      'eventually = in the end; possibly = возможно.',
      'familiar = known to you; too informal = фамильярный.',
    ],
  },
  countable: {
    title: 'Countable and uncountable nouns',
    summary: 'advice, information, news, furniture, luggage, equipment, weather, traffic and knowledge are uncountable: no a/an and no -s. For one item, say a piece of: a piece of advice.',
    points: [
      'much + uncountable (much time), many + countable (many people). a lot of works for both.',
      'news is always singular: The news is good.',
      'Wrong: an advice, informations, furnitures, luggages.',
      'some and any work for both: some advice, some apples.',
    ],
  },
  conditionals: {
    title: 'Conditionals: if + will / would',
    summary: 'No will after if and when (about the future): If it rains, we’ll stay home. For unreal situations: if + Past Simple, would + verb: If I had time, I would help.',
    points: [
      'Real: If + Present Simple, will + verb. If you hurry, you’ll catch the bus.',
      'The same after when, as soon as, before, until: I’ll call you when I get home.',
      'Unreal now: If + Past Simple, would + verb. If I were you, I’d go.',
      'Unreal past (B2): If + had done, would have done. If I had known, I would have come.',
    ],
  },
  'ed-ing': {
    title: 'Adjectives with -ed and -ing',
    summary: '-ed describes how a person feels (I’m bored, interested, tired). -ing describes the thing or situation that causes the feeling (the film is boring, interesting, tiring).',
    points: [
      'bored / boring, interested / interesting, tired / tiring, surprised / surprising, exhausted / exhausting.',
      'I’m boring means “I am a boring person”, not “I feel bored”.',
    ],
  },
  questions: {
    title: 'Word order in questions',
    summary: 'In a direct question the helper verb comes before the subject: Where do you live? In an indirect question (Could you tell me…, Do you know…) use normal word order: Could you tell me where the station is?',
    points: [
      'Direct: question word + do/does/did/is/can + subject + verb: What did you do?',
      'Indirect: Do you know / Could you tell me / I wonder + question word + subject + verb.',
      'No do/does/did in indirect questions: Do you know where she lives? (not where does she live).',
    ],
  },
  modals: {
    title: 'must, have to, mustn’t, don’t have to',
    summary: 'must / have to mean it is necessary. mustn’t means it is not allowed. don’t have to means it is not necessary — you can choose.',
    points: [
      'must is often your own decision or a rule on a sign; have to is about circumstances: I have to work on Saturday.',
      'After must and other modal verbs, no to: must go (not must to go).',
      'must has no past form — use had to: I had to wait.',
    ],
  },
  wish: {
    title: 'wish: regrets about now and the past',
    summary: 'wish + Past Simple is about now (I wish I knew). wish + Past Perfect is about the past (I wish I hadn’t said that). wish + would is about someone’s annoying behaviour.',
    points: [
      'I wish I had more free time. (I don’t have it now.)',
      'I wish I were taller. — were for all persons (was is fine in speech).',
      'I wish I had studied harder. (I didn’t study in the past.)',
      'I wish you would stop interrupting me. (Your behaviour annoys me.)',
    ],
  },
  passive: {
    title: 'The passive',
    summary: 'be + past participle, when the action matters more than who did it: The bridge was built in 1900. The form of be shows the tense: is made, was made, is being made, has been made.',
    points: [
      'Present: English is spoken here. Past: The house was sold.',
      'Continuous: The room is being cleaned. Perfect: The tickets have been booked.',
      'Who did it — with by: The book was written by Tolstoy.',
    ],
  },
  reported: {
    title: 'Reported speech',
    summary: 'When you report words after said / told / asked, the tense usually moves one step back (will → would, can → could), and a reported question has normal word order: She asked where I worked.',
    points: [
      '“I’m tired” → She said (that) she was tired.',
      '“I’ll call you” → He said he would call me.',
      'Question: “Where do you work?” → She asked me where I worked (no did).',
      'Yes/no question: “Are you ready?” → He asked if / whether I was ready.',
      'If it is still true, you can keep the tense: She said she lives in Kazan.',
    ],
  },
  comparatives: {
    title: 'Comparatives and superlatives',
    summary: 'Short adjectives: -er / the -est (cheaper, the cheapest). Long adjectives: more / the most (more expensive). Compare with than. Irregular: good — better — the best, bad — worse — the worst.',
    points: [
      'One syllable: cheap → cheaper → the cheapest; big → bigger (double consonant).',
      'Ending in -y: easy → easier → the easiest.',
      'Long: comfortable → more comfortable → the most comfortable.',
      'To make it stronger: much / a lot / far better (not very better).',
    ],
  },
  'phrasal-object': {
    title: 'Phrasal verbs: where the object goes',
    summary: 'With many phrasal verbs, a noun can go before or after the particle (pick up the kids / pick the kids up), but a pronoun must go in the middle: pick them up, not pick up them.',
    points: [
      'Separable: pick up, turn on/off, put on, take off, give back, let down, call back, ask out.',
      'Noun: turn off the TV = turn the TV off. Pronoun: turn it off (not turn off it).',
      'Not separable (with a preposition): look after, look for, get over, deal with — the object always comes after: look after them.',
    ],
  },
  future: {
    title: 'The future: will, be going to, Present Continuous',
    summary: 'will for a decision at the moment of speaking, a promise or an opinion about the future. be going to for a plan or something you can see coming. Present Continuous for an arrangement with a time and place.',
    points: [
      'will: — The phone’s ringing. — I’ll answer it. I’ll help you. I think it will rain.',
      'be going to: I’m going to learn Spanish (a plan). Look at the clouds — it’s going to rain (you can see it).',
      'Present Continuous: I’m meeting Anna at six tomorrow (it’s arranged).',
      'After when, if, before and until about the future, use Present Simple: when I get home.',
    ],
  },
  'past-continuous': {
    title: 'Past Continuous and Past Simple',
    summary: 'Past Continuous (was/were + -ing) is an action in progress in the past, the background. Past Simple is the short action that interrupted it: I was having a shower when the phone rang.',
    points: [
      'was/were + verb-ing: I was reading, they were talking.',
      'when + Past Simple (a short event), while + Past Continuous (an action in progress).',
      'Two actions in progress at the same time: While I was cooking, he was watching TV.',
      'State verbs (know, like, want) are not usually used in the continuous form.',
    ],
  },
  relative: {
    title: 'who, which, that, where, whose',
    summary: 'who (or that) for people, which (or that) for things, where for places, whose for possession: the man who lives next door, the book that you gave me, the café where we met.',
    points: [
      'who — people: the woman who helped me.',
      'which — things and animals: the phone which I bought.',
      'that — instead of who or which in everyday English.',
      'where — places: the town where I grew up. whose — possession: a friend whose sister is a doctor.',
    ],
  },
  'too-enough': {
    title: 'too and enough',
    summary: 'too + adjective means “more than is good” (too hot to drink). adjective + enough means “as much as needed” (old enough to drive). enough + noun (enough time).',
    points: [
      'too goes before the adjective: too expensive, too tired.',
      'enough goes after an adjective but before a noun: tall enough, enough money.',
      'Often followed by to + verb: too young to vote, fast enough to win.',
    ],
  },
  quantifiers: {
    title: 'few / a few, little / a little',
    summary: 'few and a few go with countable nouns (friends), little and a little with uncountable nouns (time, milk). With a it means “some, enough”; without a it means “not much, almost none”.',
    points: [
      'a few friends — some friends (and that’s good).',
      'few friends — not many friends (almost none).',
      'a little time — some time; little time — not much time.',
      'In conversation, people often say not many / not much instead of few / little.',
    ],
  },
  'so-such': {
    title: 'so and such',
    summary: 'so + adjective or adverb (so tired, so quickly), such + (a/an) + adjective + noun (such a nice day, such kind people).',
    points: [
      'so beautiful, so fast, so much, so many.',
      'such a good film, such an old house, such nice weather (uncountable — no a).',
      'A result with that: It was so cold that we stayed at home.',
    ],
  },
  'modal-deduction': {
    title: 'must be, can’t be, might be: guessing',
    summary: 'must be — you are almost sure it’s true. can’t be — you are almost sure it isn’t. might / may / could be — maybe. About the past: must have been, can’t have been.',
    points: [
      'She’s been working all day. She must be tired.',
      'That can’t be Tom — he’s in London. (not mustn’t be)',
      'I’m not sure where she is. She might be at the gym.',
      'About the past: That must have been hard. He can’t have seen us.',
    ],
  },
  'past-perfect': {
    title: 'Past Perfect',
    summary: 'had + past participle shows an action that happened before another action in the past: When we arrived, the film had already started.',
    points: [
      'had + past participle: had gone, had seen, had eaten.',
      'Often with already, just, never, by the time, before.',
      'If the order is already clear (after, before), Past Simple is also fine.',
    ],
  },
};
