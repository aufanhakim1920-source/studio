window.CURRENTS_DATA = {

  title: "Currents",
  tagline: "Where Australia's electricity came from",
  kicker: "A lateral data story",

  axis: { label: "Year", stepName: "years", from: 2005, to: 2025, tickEvery: 5 },

  unit: { short: "%", long: "of all generation", decimals: 1 },

  /* bottom of the river first. The order IS the stack. */
  series: [
    { key: "blackcoal", name: "Black coal", colour: "#E0442A",
      values: [54.0,53.4,52.8,52.2,51.6,51.0,49.6,47.8,46.4,44.8,43.4,42.6,43.4,42.4,41.0,38.6,37.0,35.8,34.4,33.0,32.0] },

    { key: "browncoal", name: "Brown coal", colour: "#C9741B",
      values: [22.5,22.4,22.3,22.2,22.1,22.0,21.6,20.6,20.0,20.2,20.0,19.6,16.8,16.4,16.2,16.0,15.2,14.2,13.4,12.4,11.5] },

    { key: "oil", name: "Oil & other", colour: "#8E6BD6",
      values: [ 2.3, 2.2, 2.1, 2.0, 1.9, 1.8, 1.8, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.6, 1.6, 1.6, 1.5, 1.4, 1.3, 1.3, 1.2] },

    { key: "gas", name: "Gas", colour: "#2F82F2",
      values: [14.0,15.6,16.5,16.7,16.6,16.3,16.0,17.9,18.9,19.6,20.3,20.7,21.7,20.6,20.4,18.6,17.8,16.8,16.4,15.4,14.8] },

    { key: "bio", name: "Bioenergy", colour: "#9BC23C",
      values: [ 0.9,0.95, 1.0, 1.0, 1.0, 1.0, 1.1, 1.1, 1.2, 1.2, 1.2, 1.2, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3] },

    { key: "hydro", name: "Hydro", colour: "#12BBD4",
      values: [ 5.9, 4.8, 4.4, 4.6, 5.0, 5.5, 6.6, 6.6, 6.4, 6.2, 6.5, 6.4, 6.3, 6.5, 5.4, 6.4, 6.5, 6.5, 6.4, 6.5, 6.5] },

    { key: "wind", name: "Wind", colour: "#3CE0A2",
      values: [ 0.4, 0.6, 0.9, 1.2, 1.6, 2.0, 2.4, 2.9, 3.5, 4.2, 4.6, 5.0, 5.4, 6.5, 7.6, 9.0, 9.9,11.0,11.6,12.7,13.5] },

    { key: "roof", name: "Solar on roofs", colour: "#FFD22E",
      values: [0.02,0.03,0.05,0.10,0.20,0.40,0.90,1.40,1.80,2.00,2.20,2.60,3.00,3.80,4.80,6.00,7.20,8.40,9.60,10.8,11.8] },

    { key: "util", name: "Solar farms", colour: "#FF9016",
      values: [   0,   0,   0,   0,   0,0.01,0.02,0.03,0.05,0.08,0.10,0.20,0.40,0.90,1.70,2.50,3.60,4.60,5.60, 6.6, 7.4] },
  ],

  /* exactly two, bottom group first — the engine draws the dividing line between
     them and puts both totals in the footer. */
  groups: [
    { name: "Burnt",  keys: ["blackcoal", "browncoal", "oil", "gas"] },
    { name: "Renewed", keys: ["bio", "hydro", "wind", "roof", "util"] },
  ],

  stops: [
    { at: 2005, title: "Coal country",
      focus: { name: "Coal", keys: ["blackcoal", "browncoal"] },
      line: "Black and brown coal together made about 77% of the electricity; wind and solar together made under one percent." },

    { at: 2013, title: "A million roofs",
      focus: { name: "Solar on roofs", keys: ["roof"] },
      line: "Australia passed one million rooftop solar systems, and panels on houses were already making about 2% of everything generated." },

    { at: 2017, title: "Hazelwood shuts",
      focus: { name: "Brown coal", keys: ["browncoal"] },
      line: "The country's largest brown-coal station closed in March, and brown coal's share fell about three points in a single year." },

    { at: 2019, title: "Wind passes water",
      focus: { name: "Wind", keys: ["wind"] },
      line: "Wind reached about 7.6% against hydro's 5.4% — the first year a new renewable outran the old one." },

    { at: 2022, title: "Half",
      focus: { name: "Coal", keys: ["blackcoal", "browncoal"] },
      line: "Coal fell to about half of all generation, down from roughly three quarters seventeen years earlier." },

    { at: 2025, title: "Two fifths",
      focus: { name: "Renewed", keys: ["bio", "hydro", "wind", "roof", "util"] },
      line: "Hydro, wind, solar and bioenergy together make about 40%, and solar alone makes about a fifth of the total." },
  ],

  strings: {
    hint:        "Drag the river to travel · or pull the year rail",
    lead:        "Largest",
    railLabel:   "Year rail — travel the whole record",
    indexLink:   "Turning points",
    indexTitle:  "Six turning points between 2005 and 2025",
    crossed:     "passed",
    here:        "you are here",
    almost:      "almost",
    ahead:       "ahead",
    back:        "back",
    dividerHi:   "renewed above",
    dividerLo:   "burnt below",
    close:       "Close",
    footNote:    "Shares of total Australian electricity generation, after the Australian Energy Statistics and the Clean Energy Council's annual reports. Financial years are labelled by their opening year; the last two years are estimates, and the split between rooftop and utility solar differs slightly between sources. Everything on screen is approximate.",
  },
};
