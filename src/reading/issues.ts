import type { Issue } from './types';

// A demo issue of a made-up magazine. It shows how a real issue will look once
// the learner sends her magazines: each article is one page, grouped by topic,
// with the magazine's own fonts, colours, illustrations and layout.

const coverArt = `
<svg class="w-art" viewBox="0 0 600 360" role="img" aria-label="A night train crossing snowy hills under the moon">
  <defs>
    <linearGradient id="w-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1d2b4a"/><stop offset="1" stop-color="#3f4f78"/>
    </linearGradient>
  </defs>
  <rect width="600" height="360" fill="url(#w-sky)"/>
  <circle cx="470" cy="80" r="38" fill="#f4e7c5"/>
  <circle cx="455" cy="70" r="38" fill="#2a3a60" opacity=".25"/>
  <g fill="#f4e7c5" opacity=".8">
    <circle cx="80" cy="50" r="1.6"/><circle cx="150" cy="95" r="1.2"/><circle cx="230" cy="40" r="1.4"/>
    <circle cx="330" cy="90" r="1"/><circle cx="560" cy="150" r="1.3"/><circle cx="40" cy="140" r="1"/>
  </g>
  <path d="M0 230 L110 120 L190 190 L290 90 L400 200 L480 140 L600 230 V360 H0Z" fill="#53628c"/>
  <path d="M290 90 L318 118 L300 112 L284 124 L270 110Z M110 120 L134 144 L116 138 L98 132Z" fill="#eef1f7"/>
  <path d="M0 270 C120 230 220 250 320 262 S520 240 600 258 V360 H0Z" fill="#dfe5ef"/>
  <path d="M0 300 C140 280 300 296 600 286 V360 H0Z" fill="#c7d0e0"/>
  <line x1="0" y1="282" x2="600" y2="276" stroke="#3a4566" stroke-width="3"/>
  <g transform="translate(120 246)">
    <rect x="0" y="6" width="96" height="26" rx="5" fill="#b8323a"/>
    <rect x="100" y="6" width="96" height="26" rx="5" fill="#b8323a"/>
    <rect x="200" y="6" width="96" height="26" rx="5" fill="#b8323a"/>
    <path d="M300 32 V12 Q300 4 312 4 H336 Q352 6 356 32Z" fill="#8f2229"/>
    <g fill="#ffd98a">
      <rect x="10" y="12" width="14" height="9" rx="1.5"/><rect x="32" y="12" width="14" height="9" rx="1.5"/><rect x="54" y="12" width="14" height="9" rx="1.5"/><rect x="76" y="12" width="12" height="9" rx="1.5"/>
      <rect x="110" y="12" width="14" height="9" rx="1.5"/><rect x="132" y="12" width="14" height="9" rx="1.5"/><rect x="154" y="12" width="14" height="9" rx="1.5"/>
      <rect x="210" y="12" width="14" height="9" rx="1.5"/><rect x="254" y="12" width="14" height="9" rx="1.5"/><rect x="314" y="10" width="18" height="10" rx="1.5"/>
    </g>
  </g>
  <g fill="#2f3d5c">
    <path d="M40 300 l12 -34 l12 34z"/><path d="M62 304 l9 -26 l9 26z"/><path d="M520 296 l12 -36 l12 36z"/><path d="M548 300 l9 -26 l9 26z"/>
  </g>
</svg>`;

const trainArt = `
<svg class="w-art" viewBox="0 0 560 230" role="img" aria-label="Sunrise over mountains seen from a train window">
  <rect width="560" height="230" rx="4" fill="#2b2a33"/>
  <rect x="22" y="18" width="516" height="194" rx="26" fill="#f6c98b"/>
  <clipPath id="w-win"><rect x="22" y="18" width="516" height="194" rx="26"/></clipPath>
  <g clip-path="url(#w-win)">
    <rect x="22" y="18" width="516" height="120" fill="#f9dcae"/>
    <circle cx="300" cy="140" r="46" fill="#ffefd2"/>
    <path d="M22 150 L120 70 L190 120 L280 50 L370 130 L450 80 L538 140 V212 H22Z" fill="#8c7a8f"/>
    <path d="M280 50 L304 74 L288 70 L272 82 L260 66Z M120 70 L140 90 L124 86 L108 82Z M450 80 L470 98 L454 94 L440 92Z" fill="#fbf4ea"/>
    <path d="M22 170 C140 140 260 168 380 156 S500 150 538 160 V212 H22Z" fill="#5f6b7a"/>
    <path d="M22 196 C160 180 330 196 538 186 V212 H22Z" fill="#3d4654"/>
  </g>
  <rect x="22" y="112" width="516" height="6" fill="#2b2a33" opacity=".7"/>
</svg>`;

const soupArt = `
<svg class="w-art" viewBox="0 0 260 240" role="img" aria-label="A bowl of soup with steam">
  <circle cx="130" cy="130" r="112" fill="#f3e3c7"/>
  <g fill="none" stroke="#c9a77a" stroke-width="5" stroke-linecap="round">
    <path d="M96 64 c-12 -14 12 -22 0 -40"/><path d="M130 58 c-12 -14 12 -22 0 -40"/><path d="M164 64 c-12 -14 12 -22 0 -40"/>
  </g>
  <ellipse cx="130" cy="122" rx="96" ry="24" fill="#d1532b"/>
  <ellipse cx="130" cy="120" rx="84" ry="17" fill="#e8733f"/>
  <g fill="#f7eee0"><circle cx="100" cy="118" r="5"/><circle cx="150" cy="114" r="4"/><circle cx="168" cy="124" r="3.5"/></g>
  <g fill="#5d8a3a"><ellipse cx="124" cy="116" rx="7" ry="3" transform="rotate(-25 124 116)"/><ellipse cx="136" cy="122" rx="6" ry="2.6" transform="rotate(20 136 122)"/></g>
  <path d="M34 122 C40 190 90 214 130 214 S220 190 226 122Z" fill="#2f5d62"/>
  <path d="M60 170 C90 194 170 194 200 170" stroke="#3f7a80" stroke-width="6" fill="none" stroke-linecap="round"/>
  <ellipse cx="130" cy="218" rx="54" ry="8" fill="#22474b"/>
</svg>`;

const sleepArt = `
<svg class="w-art" viewBox="0 0 540 190" role="img" aria-label="Chart: sleep moves between light, deep and dream sleep about five times a night">
  <g font-family="Archivo Narrow, Arial Narrow, sans-serif" font-size="12" fill="#3b4a6b">
    <text x="0" y="36">Awake</text><text x="0" y="76">Light</text><text x="0" y="116">Deep</text><text x="0" y="156">Dream</text>
    <text x="70" y="186">11 pm</text><text x="190" y="186">1 am</text><text x="310" y="186">3 am</text><text x="430" y="186">5 am</text><text x="505" y="186">7</text>
  </g>
  <g stroke="#d8deea" stroke-width="1"><line x1="62" y1="32" x2="540" y2="32"/><line x1="62" y1="72" x2="540" y2="72"/><line x1="62" y1="112" x2="540" y2="112"/><line x1="62" y1="152" x2="540" y2="152"/></g>
  <path d="M62 32 H80 V72 H100 V112 H150 V72 H170 V152 H190 V72 H215 V112 H250 V72 H280 V152 H310 V72 H340 V112 H355 V72 H390 V152 H425 V72 H460 V152 H500 V72 H520 V32 H540"
    fill="none" stroke="#2c4fa3" stroke-width="3" stroke-linejoin="round"/>
  <g fill="#f0b43c" opacity=".35"><rect x="100" y="104" width="50" height="16"/><rect x="215" y="104" width="35" height="16"/></g>
</svg>`;

export const ISSUES: Issue[] = [
  {
    id: 'wayfarer-12',
    magazine: 'Wayfarer',
    issue: 'No. 12',
    date: 'Winter 2026',
    theme: 'mag-wayfarer',
    cover: { bg: '#1d2b4a', fg: '#f4e7c5', accent: '#b8323a' },
    pages: [
      {
        id: 'cover',
        topic: 'Cover',
        title: 'Cover & contents',
        dek: 'What’s inside this issue',
        html: `
<article class="w-cover">
  <header class="w-mast">
    <div class="w-mast-name">Wayfarer</div>
    <div class="w-mast-line"><span>No. 12</span><span>Slow travel · food · ideas</span><span>Winter 2026</span></div>
  </header>
  ${coverArt}
  <h1 class="w-cover-head">The night train <em>north</em></h1>
  <p class="w-cover-dek">Fourteen hours, one narrow bed and a sunrise over the Highlands.</p>
  <section class="w-contents" aria-label="Contents">
    <h2>In this issue</h2>
    <ol>
      <li><span class="w-num">04</span><span class="w-kicker">Travel</span><b>The Night Train North</b><i>Why sleeper trains are coming back.</i></li>
      <li><span class="w-num">12</span><span class="w-kicker">Food</span><b>In Praise of Soup</b><i>Patience, onions and a squeeze of lemon.</i></li>
      <li><span class="w-num">20</span><span class="w-kicker">Science</span><b>What Your Brain Does at Night</b><i>The cleaning shift starts when you fall asleep.</i></li>
    </ol>
  </section>
</article>`,
      },
      {
        id: 'night-train',
        topic: 'Travel',
        title: 'The Night Train North',
        dek: 'Why sleeper trains are coming back',
        html: `
<article class="w-article">
  <p class="w-kicker-line"><span class="w-kicker">Travel</span><span class="w-folio">Wayfarer · 04</span></p>
  <h1 class="w-head">The Night Train North</h1>
  <p class="w-dek">Fourteen hours, one narrow bed and a sunrise over the Highlands. Why travellers are choosing to sleep their way across a continent.</p>
  <p class="w-byline">Words by Anna Reeve · Illustration by Tom Hale</p>
  ${trainArt}
  <div class="w-cols">
    <p class="w-drop">There is a particular kind of quiet on a sleeper train at midnight. The corridor lights are dimmed, someone is whispering into a phone, and the carriage rocks gently as the city slips away behind you.</p>
    <p>For years, night trains looked like a relic of the past. Flights were cheap, fast and convenient, and the old sleeper routes were losing money. But something has shifted. Across Europe, operators are adding new routes, and many of them are fully booked weeks in advance.</p>
    <p>Part of the reason is the climate. A seat on a train produces a fraction of the emissions of the same journey by plane. But passengers rarely talk about carbon first. They talk about the feeling of arriving rested, in the centre of a city, without queues or security checks.</p>
    <blockquote class="w-pull">“You go to bed in one country and wake up in another.”</blockquote>
    <p>“You lose a day if you fly,” says Marta, a teacher who takes the sleeper to Scotland every winter. “On the train, the journey becomes part of the holiday.”</p>
    <p>It isn’t luxury. The cabins are tiny, the showers are unpredictable, and you may share a room with a stranger who snores. Still, when the blinds go up at seven and the first light hits the snow on the mountains, few people complain.</p>
  </div>
  <aside class="w-box">
    <h3>Before you go</h3>
    <ul>
      <li><b>Book early.</b> Cabins sell out long before seats do.</li>
      <li><b>Pack light.</b> There is barely room to turn around.</li>
      <li><b>Bring earplugs</b> and a warm layer for the morning.</li>
    </ul>
  </aside>
</article>`,
      },
      {
        id: 'soup',
        topic: 'Food',
        title: 'In Praise of Soup',
        dek: 'Patience, onions and a squeeze of lemon',
        html: `
<article class="w-article w-food">
  <p class="w-kicker-line"><span class="w-kicker">Food</span><span class="w-folio">Wayfarer · 12</span></p>
  <div class="w-split">
    <div>
      <h1 class="w-head">In Praise <br/>of Soup</h1>
      <p class="w-dek">It is what we eat when we are ill, tired or short of money. That is exactly why it is so good.</p>
    </div>
    ${soupArt}
  </div>
  <div class="w-cols">
    <p class="w-drop">Soup has an image problem. It is what we eat when we are ill, tired or short of money. Yet almost every culture has a soup it is proud of, and most of them were invented for exactly those reasons.</p>
    <p>A good soup is a lesson in patience rather than skill. You soften an onion slowly, add whatever vegetables need using up, pour in stock and wait. The heat does most of the work. Leftovers that would otherwise be thrown away become dinner for four.</p>
    <p>Chefs often say that the secret is in the base. Cooking onions, carrots and celery gently, without letting them brown, builds a sweetness that no spice can replace. A squeeze of lemon at the end brightens everything.</p>
    <p>Soup is also forgiving. If it is too thick, add water. If it is too thin, let it simmer for longer. If it is bland, it probably needs salt — more than you expect.</p>
    <p>Perhaps that is why it feels so comforting. In a world that demands speed and perfection, soup asks for neither.</p>
  </div>
  <aside class="w-recipe">
    <h3>Ten-minute tomato soup</h3>
    <p class="w-serves">Serves 2</p>
    <ul>
      <li>1 onion, finely chopped</li>
      <li>2 cloves of garlic</li>
      <li>1 tin of chopped tomatoes</li>
      <li>300 ml vegetable stock</li>
      <li>salt, pepper, a pinch of sugar</li>
    </ul>
    <p>Fry the onion in olive oil until soft, add the garlic for one minute, then the tomatoes and stock. Simmer for five minutes, blend and season to taste.</p>
  </aside>
</article>`,
      },
      {
        id: 'sleep',
        topic: 'Science',
        title: 'What Your Brain Does at Night',
        dek: 'The cleaning shift starts when you fall asleep',
        html: `
<article class="w-article w-science">
  <p class="w-kicker-line"><span class="w-kicker">Science</span><span class="w-folio">Wayfarer · 20</span></p>
  <h1 class="w-head">What Your Brain Does at Night</h1>
  <p class="w-dek">While you sleep, a cleaning shift begins. It may be the best study tool you have.</p>
  <div class="w-facts">
    <div><b>7–9</b><span>hours of sleep most adults need</span></div>
    <div><b>1 in 3</b><span>people regularly get less than that</span></div>
    <div><b>4–5</b><span>sleep cycles in a full night</span></div>
  </div>
  <div class="w-cols">
    <p class="w-drop">While you sleep, your brain is far from idle. Scientists have discovered that during deep sleep, a clear fluid flows through the brain in slow, rhythmic waves, washing away waste that builds up during the day.</p>
    <p>One of those waste products is a protein linked to memory problems later in life. In experiments, researchers found that it is cleared much faster when we are asleep than when we are awake.</p>
    <p>Sleep also helps us to store what we have learned. During the night, the brain replays the events of the day, strengthening some connections and weakening others. This is one reason why studying late into the night is often less effective than getting a full night’s rest and reviewing in the morning.</p>
    <p>The good news is that small changes help. Going to bed at the same time each night, keeping the bedroom cool and dark, and putting your phone away an hour before bed can all make a noticeable difference.</p>
  </div>
  <figure class="w-figure">
    ${sleepArt}
    <figcaption><b>A night in cycles.</b> We move between light, deep and dream sleep several times. Most deep sleep, shaded, happens early in the night.</figcaption>
  </figure>
</article>`,
      },
    ],
  },
];

export const ISSUES_BY_ID: Record<string, Issue> = Object.fromEntries(ISSUES.map((i) => [i.id, i]));
