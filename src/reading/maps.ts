// Contents maps for magazines the learner owns. A map holds no magazine text,
// only how an issue splits into sections and articles: when she adds the PDF
// on her phone, the app recognises the issue and lays out the contents.
// Page numbers are PDF pages, starting at 1.

export interface ArticleMap {
  topic: string;
  title: string;
  dek?: string;
  from: number;
  to: number;
}

export interface IssueMap {
  magazine: string;
  issue: string;
  date: string;
  cover: { bg: string; fg: string; accent: string };
  /** Recognises the issue from its page count and the text on the first page. */
  match: { pages: number; firstPage: string[] };
  articles: ArticleMap[];
}

export const ISSUE_MAPS: IssueMap[] = [
  {
    magazine: 'Happiful',
    issue: 'Issue 113',
    date: '2026',
    cover: { bg: '#f6d9c8', fg: '#1b3a4b', accent: '#e0574f' },
    match: { pages: 68, firstPage: ['ISSUE 113', 'MENTAL HEALTH'] },
    articles: [
      { topic: 'Start here', title: 'Cover', from: 1, to: 2 },
      { topic: 'Start here', title: 'The (not so) little things', dek: 'Editor’s letter', from: 3, to: 3 },
      { topic: 'Start here', title: 'Contents', from: 4, to: 5 },
      { topic: 'Start here', title: 'Meet the experts', dek: 'The team behind this issue', from: 6, to: 6 },

      { topic: 'Culture', title: 'Need-to-know news', dek: 'Mosaics, women’s sport and hospital poetry', from: 7, to: 9 },
      { topic: 'Culture', title: 'Wellbeing wrap', dek: 'Good news from around the world', from: 13, to: 13 },
      { topic: 'Culture', title: 'Books you’ll love', dek: 'Happiful reads', from: 33, to: 33 },
      { topic: 'Culture', title: 'The Happiful Poetry Prize', dek: 'The prize returns for 2027', from: 40, to: 40 },
      { topic: 'Culture', title: 'Happiful recommends', dek: 'Things to try this month', from: 41, to: 41 },

      { topic: 'Mind', title: 'The road to contentment', dek: 'Author Richard Templar on everyday happiness', from: 10, to: 11 },
      { topic: 'Mind', title: 'What is the nocebo effect?', dek: 'How negative expectations change what we feel', from: 14, to: 15 },
      { topic: 'Mind', title: 'Returning to the water', dek: 'Why wild swimming is so supportive', from: 24, to: 27 },
      { topic: 'Mind', title: 'Healing is a spiral', dek: 'Why growth isn’t a straight line', from: 49, to: 51 },
      { topic: 'Mind', title: 'Poetry as medicine', dek: 'How a simple stanza can help us heal', from: 54, to: 56 },
      { topic: 'Mind', title: 'Finding a place to belong', dek: 'Roxy Bourdillon on community and queer spaces', from: 57, to: 59 },

      { topic: 'Positive pointers', title: 'Sleep easy', dek: '6 ways to sleep better that you haven’t tried', from: 16, to: 17 },
      { topic: 'Positive pointers', title: 'Reinventing retirement', dek: 'Finding purpose later in life', from: 42, to: 43 },
      { topic: 'Positive pointers', title: 'When something feels off', dek: 'Feeling distant from your partner', from: 52, to: 53 },

      { topic: 'Wellbeing', title: 'In the garden', dek: 'A community garden that grows joy', from: 35, to: 37 },
      { topic: 'Wellbeing', title: 'Past life regression', dek: 'A journey into the subconscious', from: 44, to: 46 },
      { topic: 'Wellbeing', title: 'Keep it short', dek: 'Writing micro-memoirs', from: 63, to: 65 },

      { topic: 'Food & health', title: 'Uplifting, colourful, delicious', dek: 'A rainbow bowl recipe', from: 18, to: 19 },
      { topic: 'Food & health', title: 'The circular economy', dek: 'Making things last', from: 22, to: 23 },
      { topic: 'Food & health', title: 'The truth about hydration', dek: 'Do we really need to drink so much?', from: 30, to: 32 },

      { topic: 'Regulars', title: 'Is this my dream or someone else’s?', dek: 'Expert column by Kate Kilby', from: 20, to: 21 },
      { topic: 'Regulars', title: 'Anxiety on your mind', dek: 'Leah Hunt on living with anxiety', from: 28, to: 29 },
      { topic: 'Regulars', title: 'Community corner', dek: 'From sewing machine to self-employed', from: 38, to: 39 },
      { topic: 'Regulars', title: 'Happiful voices', dek: 'Readers on comparison', from: 47, to: 47 },
      { topic: 'Regulars', title: 'Ask the experts', dek: 'Living with acid reflux', from: 60, to: 61 },
      { topic: 'Regulars', title: 'Where to find help', dek: 'Support services', from: 67, to: 67 },

      { topic: 'Try this at home', title: 'Puzzle break', from: 12, to: 12 },
      { topic: 'Try this at home', title: 'Your recovery routine', dek: 'A gentle mental recovery day', from: 62, to: 62 },
      { topic: 'Try this at home', title: 'Get out of a reading slump', dek: '5 ways back to books', from: 66, to: 66 },
    ],
  },
];

export function findMap(pages: number, firstPageText: string): IssueMap | undefined {
  const squash = (x: string) => x.toUpperCase().replace(/\s+/g, '');
  const text = squash(firstPageText);
  return ISSUE_MAPS.find((m) => m.match.pages === pages && m.match.firstPage.every((s) => text.includes(squash(s))));
}
