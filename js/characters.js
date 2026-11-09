// Gameplay data for every character that can pop out of a hole.

export const CHARACTERS = {
  macron: {
    name: 'Macron',
    nickname: '"Jupiter"',
    points: 10,
    speed: 1.0, // multiplier on how long he stays up
    weight: 30,
    help: 'Sometimes pops up in two holes AT THE SAME TIME. Smash both for a bonus!',
    lines: [
      'At the same time…',
      'Just cross the street!',
      'Make our planet great again!',
      'Pension reform!',
      'Jupiter has spoken.',
      'Let me explain for 3 hours…',
    ],
    ouch: ['Sacrebleu!', 'Oh là là!', 'Zut alors!', 'Not the hair!'],
  },
  obama: {
    name: 'Obama',
    nickname: '"Yes we can"',
    points: 15,
    speed: 0.68,
    weight: 24,
    help: 'The fastest of the bunch. Blink and he is gone.',
    lines: ['Yes we can!', 'Let me be clear…', 'Change!', 'Hope!', 'Thanks, Obama.'],
    ouch: ["No we can't!", 'Not cool!', 'Ouch, folks.'],
    escape: ['Obama out. 🎤', 'Yes I can… escape!'],
  },
  casseur: {
    name: 'Black Bloc',
    nickname: '"The Casseur"',
    points: 20,
    speed: 1.15,
    weight: 18,
    hp: 2,
    help: 'Hood, cap and mask: takes TWO hits to go down.',
    lines: [
      'Smash the system!',
      'Nice shop window…',
      'Just here for the sneakers.',
      'Is this the pension protest?',
      'Down with… everything!',
      'Free paving stones!',
    ],
    tough: ['Is that all?', 'Not even a scratch!', 'My hood absorbed it!'],
    ouch: ['Not the sneakers!', 'I want my mom!', "I'm calling my lawyer!", 'Ouch, the system!'],
  },
  defunes: {
    name: 'De Funès',
    nickname: '"Rabbi Jacob"',
    points: 30,
    speed: 0.6,
    weight: 7,
    rare: true, // golden glow, splash of green chewing gum when smashed
    help: 'Rare and hyperactive: smash him before he dances away. Splashes green chewing gum!',
    lines: [
      'Non! Oui! Non!',
      'Hop hop hop!',
      'Salomon, hurry up!',
      "It's my daughter's wedding!",
      'Rabbi Jacob is dancing!',
      'Calmos, calmos!',
    ],
    ouch: ['Not the chewing gum!', 'Ma biche!', 'Ouh la la la la!'],
    escape: ['Hop! Danced away!', 'Rabbi Jacob, gone dancing!'],
  },
  taxpayer: {
    name: 'Taxpayer',
    nickname: 'innocent mole',
    points: -25,
    speed: 1.25,
    weight: 9,
    decoy: true,
    help: "DON'T HIT HIM! −25 points and your combo is gone. He has suffered enough.",
    lines: ['Please, no!', 'I just pay taxes!', 'Hit THEM, not me!', "I'm innocent!"],
    ouch: ['Taxes AND this?!', 'Why me?!', 'I pay your salary!'],
  },
};

export const LEADERS = ['macron', 'obama', 'casseur', 'defunes'];
export const ALL_TYPES = [...LEADERS, 'taxpayer'];

export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
