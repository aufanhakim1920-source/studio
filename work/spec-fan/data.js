/* The deck. Every blade is a real finding from the vault, with its real tally.
 *
 * `n` is how many sites the finding rests on — it drives the blade's LENGTH, so
 * the weight of the evidence is visible before a word is read.
 * `state` drives the blade's COLOUR: held / bent / snapped.
 *
 * Nothing here is invented. Where a rule was retracted, the reason is the one
 * actually recorded, including the two where the instrument was at fault rather
 * than the sites.
 */
window.DECK = [
  {
    id: "01", state: "held", n: 13,
    rule: "A transition is 0.1–0.15s",
    body: "Linear runs 0.1s on 249 elements. Vercel 80. Tally 50. The slowest dominant value anywhere is Typeform at 0.3s — the number most people reach for first.",
    do: "0.15s for a hover or a state change. Reserve 0.3–0.7s for something that physically travels.",
    from: "13 products measured at 1440px",
  },
  {
    id: "02", state: "held", n: 20,
    rule: "Body size comes from the verb, not the category",
    body: "Five separate per-category rules turned out to be one rule restated five times. Scan a grid at 11–12px. Work a tool at 13–14px. Read a plan or fill a form at 15–16px.",
    do: "Ask what the visitor is doing, then pick the size. 'Dashboard' is not a verb.",
    from: "20+ pages, four bands",
  },
  {
    id: "03", state: "held", n: 5,
    rule: "Display type takes negative tracking",
    body: "Vercel sets 56px at −3.4px. Notion 64px at −2.1px. Framer 54px at −2.2px. Linear 72px at −1.6px.",
    do: "−0.03em to −0.06em above 40px. letter-spacing:normal on a big heading is one of the clearest amateur tells.",
    from: "5 of 5 pricing pages",
  },
  {
    id: "04", state: "held", n: 5,
    rule: "A pricing card is 330–420px",
    body: "Vercel's 348px column repeats 684 times on one page. Notion and Stripe both land on 397px. Framer 327px.",
    do: "Build plan cards at 340–400px. Four across at 348px plus gaps is a 1440 viewport.",
    from: "5 of 5 pricing pages",
  },
  {
    id: "05", state: "held", n: 29,
    rule: "Two radius tiers, or a committed zero",
    body: "Nothing runs one middling value on every surface and every control. Nothing has 384 pill elements and otherwise 6 and 8. Teenage Engineering ships no radius at all.",
    do: "Pill for controls, near-zero for surfaces — or nothing anywhere. border-radius:12px on everything is the signature.",
    from: "29 live pages, 25 references",
  },
  {
    id: "06", state: "held", n: 25,
    rule: "A light ground is never pure white",
    body: "24 of 25 curated references avoid #FFFFFF. Real shops do use it — but for the card, never the ground: Hodinkee's page sits on #F5F7F7, Teenage Engineering on #F6F8F7.",
    do: "Tint the ground. White is legitimate for the card sitting on it.",
    from: "25 references, 14 live pages",
  },
  {
    id: "07", state: "held", n: 33,
    rule: "Nothing large loops forever",
    body: "Linear, Tally and Vercel have zero ambient motion — completely still until touched. Where loops exist they are small and slow: Linear's grid dots run 3.2s.",
    do: "Move on hover, on click, on scroll-into-view once. Never on a timer.",
    from: "24 still against 9 with any loop",
  },
  {
    id: "08", state: "held", n: 4,
    rule: "A reading column is not a card",
    body: "Every column in the library was a card — 330–420px pricing, 350–480px product. Nothing described a column you read a paragraph in. Stripe Docs' 486px repeats 219 times.",
    do: "480–560px for prose, 60–65ch. Up to 700px only when it holds tables or code.",
    from: "4 documentation sites",
  },
  {
    id: "09", state: "held", n: 3,
    rule: "A form runs a size larger than the shop around it",
    body: "Stripe Checkout 15px, Typeform 16px, Tally 16px — against 12px for commerce. You scan a shop; you fill in a form, checking your own typing.",
    do: "15–16px minimum inside a form, even when the product runs 12px elsewhere.",
    from: "3 of 3 payment and form products",
  },
  {
    id: "10", state: "held", n: 33,
    rule: "prefers-reduced-motion is near-universal",
    body: "29 of 33 pages ship it. This blade nearly snapped — the tool reported four misses, and three were sites the instrument could not see into.",
    do: "Ship it. One media query. Its absence is a defect, not a style choice.",
    from: "29 comply, 4 genuinely do not",
  },
  {
    id: "11", state: "bent", n: 4,
    rule: "One neutral sans doing every job is the failure",
    body: "Held for a while, then Railway, Cal.com, Grafana and Tally all shipped Inter alone. Three of the four are functional screens — a booking widget, a dashboard, a form builder. Railway is the exception: a marketing page.",
    do: "Pair the type on a page that sells. Inside a product screen a single sans is normal and costs nothing.",
    from: "8 clean pairings against 4 unpaired",
  },
  {
    id: "12", state: "bent", n: 2,
    rule: "Read-at-length wants 17–18px",
    body: "Rested on Elicit alone at 17.6px. Then Wikipedia — the largest read-at-length surface there is — topped out at 16px. One against one is not a band.",
    do: "Read at length is 16px. 17–18px is an editorial choice, not a measured norm.",
    from: "1 for, 1 against",
  },
  {
    id: "13", state: "bent", n: 16,
    rule: "Nobody uses a free typeface",
    body: "Fourteen commercial pages and not one Google font — then Stripe's own docs turned up running the system stack, with zero references to sohne, their licensed face. IBM Plex is free and is unmistakably a voice.",
    do: "The axis was never paid-versus-free. It is the brand's own voice against a generic default — and on a docs page, no voice at all is a legitimate third answer.",
    from: "14 marketing pages, 2 docs sites",
  },
  {
    id: "14", state: "snapped", n: 11,
    rule: "A custom cubic-bezier is the mark of a considered product",
    body: "Wrong at the value level, not just the count. Notion's 'custom curve' is the ease-in keyword written longhand. Vercel's is Tailwind's default. IBM Carbon publishes eight motion curves and runs plain ease 62 times on its own site, against its own tokens 28 times.",
    do: "The spelling predicts your toolchain, not your craft. Ignore it entirely.",
    from: "13 bezier against 11 keyword — no pattern",
  },
  {
    id: "15", state: "snapped", n: 1,
    rule: "A good motion system does not predict accessibility",
    body: "Built on a single site that turned out to comply. The detector only read top-level CSS rules, so a media query nested inside @layer was invisible — and Tailwind puts everything inside @layer. Clerk ships four such rules. The instrument was broken, not the site.",
    do: "Retracted whole. A detector that can only say yes or no will manufacture false noes; every one needs a third state for could-not-see.",
    from: "Retracted — instrument fault",
  },
];
