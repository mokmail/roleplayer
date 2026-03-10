import { SceneContext } from '../types';

export interface StarterScenario {
  id: string;
  title: string;
  tagline: string;
  description: string;
  context: SceneContext;
}

export const STARTER_SCENARIOS: StarterScenario[] = [
  {
    id: 'noir-stakeout',
    title: 'Noir Stakeout',
    tagline: 'Rain, secrets, and a botched handoff.',
    description: 'A writing-ready crime scene with tense loyalties, conflicting agendas, and immediate momentum.',
    context: {
      theme: 'Noir',
      location: 'A rain-soaked alley behind the Marrow Club',
      plot: 'A blackmail ledger was supposed to change hands tonight, but the courier is dead and everyone else is pretending not to know why.',
      summary: 'Three dangerous allies circle the same clue while the city closes in around them.',
      playerProfile: {
        name: 'Alex Mercer',
        role: 'Freelance fixer caught in the middle',
        persona: 'Calm under pressure, observant, and careful about trust. You survive by reading the room before speaking.',
        objective: 'Recover the ledger before the police or syndicate gets it, and decide who can be trusted with the truth.'
      },
      characters: [
        {
          id: 'noir-1',
          name: 'Vivian Vale',
          personality: 'Elegant, unreadable, and always a step ahead. Vivian speaks with velvet precision, offering half-truths as if they were gifts. She protects herself with charm and weaponizes silence when cornered.',
          backstory: 'Once the confidante of a powerful judge, Vivian escaped a scandal by feeding the right names to the wrong people. Now she deals in rumors, leverage, and survival.',
          isPresent: true,
          race: 'Human',
          profession: 'Informant',
          alignment: 'Compromised',
          background: 'High society scandal',
          socialStanding: 'Upper Crust',
          powerSource: 'Secret Knowledge',
          vibe: 'Monochrome',
          paradox: 'The Optimistic Cynic'
        },
        {
          id: 'noir-2',
          name: 'Jonah Cross',
          personality: 'A bruised ex-detective with a rigid moral code and a talent for sounding tired without ever sounding weak. He notices everything and forgives almost nothing.',
          backstory: 'Jonah lost his badge after refusing to bury evidence tied to city hall. He now works cases no one else wants and keeps dossiers on everyone worth fearing.',
          isPresent: true,
          race: 'Human',
          profession: 'Private Investigator',
          alignment: 'Unyielding',
          background: 'Disgraced officer',
          socialStanding: 'Police Force',
          powerSource: 'Pure Grit',
          vibe: 'Rainy',
          paradox: 'The Honest Thief'
        },
        {
          id: 'noir-3',
          name: 'Marlowe Finch',
          personality: 'Smooth-talking, restless, and nervy beneath the polish. Marlowe jokes when pressure rises and lies by instinct, but panic makes him unexpectedly honest in flashes.',
          backstory: 'A failed jazz pianist turned bookmaker, Marlowe got too close to a mayoral fixer and now knows enough to ruin careers or end up in the harbor.',
          isPresent: true,
          race: 'Human',
          profession: 'Bookmaker',
          alignment: 'Survivalist',
          background: 'Underworld errand boy',
          socialStanding: 'Underworld',
          powerSource: 'Desperation',
          vibe: 'Tobacco-stained',
          paradox: 'The Soft-hearted Enforcer'
        }
      ],
      events: [],
      structuredEvents: [],
      maxTurnsPerResponse: 2,
      autoTurnOrder: 'sequential'
    }
  },
  {
    id: 'fantasy-tavern',
    title: 'Fantasy Tavern Hook',
    tagline: 'A prophecy arrives before the drinks do.',
    description: 'Classic party assembly with distinct voices, a shared mystery, and immediate quest energy.',
    context: {
      theme: 'Fantasy',
      location: 'The Lanternwake Tavern at the edge of the flooded marsh road',
      plot: 'A dying courier has delivered half a map and a warning: if the party leaves by dawn, they may stop the waking thing beneath the old abbey.',
      summary: 'The first chapter is ready: strangers, a prophecy, and too little time to argue.',
      playerProfile: {
        name: 'Rowan Vale',
        role: 'Newly chosen bearer of the map',
        persona: 'Earnest, brave when cornered, and more capable than you first appear. You are not yet comfortable being the center of prophecy.',
        objective: 'Get the party moving before dawn and learn why the abbey is tied to your family name.'
      },
      characters: [
        {
          id: 'fantasy-1',
          name: 'Elara Thorne',
          personality: 'Disciplined, scholarly, and severe with herself. Elara treats every mystery like a sacred test, yet her compassion leaks through whenever someone weaker is at risk.',
          backstory: 'Raised in a monastic library, Elara was expelled after breaking holy law to save forbidden texts from a purge. She now hunts knowledge before zealots can erase it.',
          isPresent: true,
          race: 'Human',
          profession: 'Archmage',
          alignment: 'Lawful Good',
          background: 'Temple Orphan',
          magicSystem: 'Runic Inscription',
          socialStanding: 'Lesser Nobility',
          powerSource: 'Deep Study',
          vibe: 'Crystalline',
          paradox: 'The Healer who kills'
        },
        {
          id: 'fantasy-2',
          name: 'Brannic Holt',
          personality: 'Blunt, loyal, and deeply practical. Brannic mistrusts grand speeches, trusts good steel, and carries guilt like extra armor.',
          backstory: 'A former royal guard who failed to prevent a palace coup, Brannic now sells his sword only to causes that feel like penance.',
          isPresent: true,
          race: 'Human',
          profession: 'Paladin',
          alignment: 'Neutral Good',
          background: 'Royal Guard',
          magicSystem: 'Elemental Channeling',
          socialStanding: 'Free Merchant',
          powerSource: 'Ancient Artifact',
          vibe: 'Rustic',
          paradox: 'The Cowardly Knight'
        },
        {
          id: 'fantasy-3',
          name: 'Sable Reed',
          personality: 'Quick-witted, irreverent, and hard to pin down. Sable masks fear with humor and survives by spotting exits before anyone else notices the fire.',
          backstory: 'Once a street courier for thieves and rebels alike, Sable stole the wrong satchel and accidentally became the keeper of a map kingdoms would kill for.',
          isPresent: true,
          race: 'Elf',
          profession: 'Bard',
          alignment: 'Chaotic Neutral',
          background: 'Street Urchin',
          magicSystem: 'Wild Magic',
          socialStanding: 'Outlaw',
          powerSource: 'Innate Blood',
          vibe: 'Ethereal',
          paradox: 'The Illiterate Scholar'
        }
      ],
      events: [],
      structuredEvents: [],
      maxTurnsPerResponse: 3,
      autoTurnOrder: 'sequential'
    }
  },
  {
    id: 'cyberpunk-breach',
    title: 'Cyberpunk Breach',
    tagline: 'The data is live. The city is watching.',
    description: 'A high-pressure infiltration setup with a clear objective and sharp team dynamics.',
    context: {
      theme: 'Cyberpunk',
      location: 'A hidden maintenance deck beneath the Helix Biodyne arcology',
      plot: 'A whistleblower shard containing evidence of human experimentation must be extracted before the corporation seals the district.',
      summary: 'The team is in position, the clock is running, and betrayal is statistically likely.',
      playerProfile: {
        name: 'Kade',
        role: 'Inside contact with the extraction codes',
        persona: 'Resourceful, fast-thinking, and trying not to show how personal this mission is. You know more than the team realizes.',
        objective: 'Get the shard out alive and keep Helix from identifying you as the source.'
      },
      characters: [
        {
          id: 'cyber-1',
          name: 'Nyx Mercer',
          personality: 'Cool, exacting, and emotionally compartmentalized. Nyx prefers plans to people, but their buried empathy makes them reckless when innocents get caught in the blast radius.',
          backstory: 'A former corporate intrusion analyst, Nyx vanished after discovering Helix was testing obedience edits on debtors. Now they burn systems from the outside.',
          isPresent: true,
          race: 'Cyborg',
          profession: 'Netrunner',
          alignment: 'Anti-Corporate',
          background: 'Corporate Lab Rat',
          magicSystem: 'Neural Grafting',
          socialStanding: 'Lower Block Resident',
          powerSource: 'Neural Link',
          vibe: 'Glitchy',
          paradox: 'The Moral Mercenary'
        },
        {
          id: 'cyber-2',
          name: 'Rook Ash',
          personality: 'Dry, sardonic, and hyper-alert. Rook talks like nothing matters, then quietly takes the most dangerous job before anyone else can volunteer.',
          backstory: 'Military black-ops left Rook with half a spine of combat chrome and a permanent distrust of command structures.',
          isPresent: true,
          race: 'Human',
          profession: 'Solo',
          alignment: 'Survivalist',
          background: 'Military Veteran',
          magicSystem: 'Chemical Overdrive',
          socialStanding: 'Street Trash',
          powerSource: 'Experimental Drugs',
          vibe: 'Chrome',
          paradox: 'The Analog Netrunner'
        },
        {
          id: 'cyber-3',
          name: 'Luma Vey',
          personality: 'Bright, charming, and socially elastic. Luma can talk anyone into anything, but every smile hides a private running calculation.',
          backstory: 'Once a luxury augment influencer, Luma sold access to executive spaces until Helix erased someone she cared about from the network and from the public record.',
          isPresent: true,
          race: 'Bio-engineered Variant',
          profession: 'Fixer',
          alignment: 'Idealist',
          background: 'Ex-Executive',
          magicSystem: 'Technomancy',
          socialStanding: 'Salaryman',
          powerSource: 'Black Market Tech',
          vibe: 'Neon-drenched',
          paradox: 'The Empathic AI'
        }
      ],
      events: [],
      structuredEvents: [],
      maxTurnsPerResponse: 2,
      autoTurnOrder: 'random'
    }
  },
  {
    id: 'romance-gala',
    title: 'Romance Gala',
    tagline: 'Masks on, hearts exposed.',
    description: 'A social, emotionally charged starter for romance, intrigue, and slow-burn confrontation.',
    context: {
      theme: 'Romance',
      location: 'The moonlit conservatory of House Valmere during the winter gala',
      plot: 'A public engagement is about to be announced, but old affection, family pressure, and one unsigned letter threaten to collapse the evening.',
      summary: 'Everyone looks exquisite. No one is telling the truth.',
      playerProfile: {
        name: 'Julian Hart',
        role: 'The expected guest who changes the room',
        persona: 'Poised on the surface, deeply conflicted beneath it. You are trying to protect someone without exposing your own heart.',
        objective: 'Decide whether to stop the announcement, reveal the letter, or let the night play out.'
      },
      characters: [
        {
          id: 'romance-1',
          name: 'Celeste Arden',
          personality: 'Graceful, observant, and aching under perfect manners. Celeste has spent years becoming what others needed, and is one confession away from refusing the role entirely.',
          backstory: 'Born into a family that trades affection for influence, Celeste learned to survive by being admired. The cost has been never feeling chosen for herself.',
          isPresent: true,
          race: 'Human',
          profession: 'Socialite',
          alignment: 'Duty-Bound',
          background: 'Arrangement',
          socialStanding: 'Socialite',
          powerSource: 'Heartbreak',
          vibe: 'Dreamy',
          paradox: 'The Lonely Romantic'
        },
        {
          id: 'romance-2',
          name: 'Adrian Vale',
          personality: 'Soft-spoken, intensely loyal, and emotionally dangerous in his restraint. Adrian says little, but every word sounds like it has survived a private war.',
          backstory: 'A composer from a once-respected house, Adrian returned from exile with a patron, a reputation, and unfinished feelings he never meant to test in public.',
          isPresent: true,
          race: 'Human',
          profession: 'Musician',
          alignment: 'Devoted',
          background: 'Forbidden love',
          socialStanding: 'Working Class',
          powerSource: 'Unwavering Devotion',
          vibe: 'Melancholic',
          paradox: 'The Faithless Devotee'
        },
        {
          id: 'romance-3',
          name: 'Lucien March',
          personality: 'Polished, charming, and impossible to read until the mask slips. Lucien wants control more than affection, but genuine vulnerability keeps ambushing him.',
          backstory: 'The favored heir of a rival house, Lucien agreed to a strategic courtship certain it would be easy. Then the performance began to feel too real.',
          isPresent: true,
          race: 'Human',
          profession: 'Rival Suitor',
          alignment: 'Chivalrous',
          background: 'Long-distance',
          socialStanding: 'Celebrity',
          powerSource: 'Obsession',
          vibe: 'Graceful',
          paradox: 'The Heartbreaking Healer'
        }
      ],
      events: [],
      structuredEvents: [],
      maxTurnsPerResponse: 2,
      autoTurnOrder: 'manual'
    }
  }
];
