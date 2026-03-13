// exhaustive list of narrative themes covering many roleplay genres and social storylines
export type NarrativeTheme =
  | 'Family'
  | 'Romance'
  | 'Mystery'
  | 'Adventure'
  | 'Drama'
  | 'Comedy'
  | 'Horror'
  | 'Sci-Fi'
  | 'Historical'
  | 'Fantasy'
  | 'Western'
  | 'Cyberpunk'
  | 'Noir'
  | 'Thriller'
  | 'Supernatural'
  | 'Post-Apocalyptic'
  | 'Dystopian'
  | 'Utopian'
  | 'Crime'
  | 'Political'
  | 'Slice-of-Life'
  | 'Coming-of-Age'
  | 'Epic'
  | 'War'
  | 'Spy'
  | 'Heist'
  | 'Mythology';

export type RelationshipKind = string;

export const PREDEFINED_RELATIONSHIP_TYPES: RelationshipKind[] = [
  'Ally',
  'Friend',
  'Best Friend',
  'Close Friend',
  'Childhood Friend',
  'Companion',
  'Confidant',
  'Trusted Ally',
  'Partner',
  'Teammate',
  'Associate',
  'Acquaintance',
  'Neighbor',
  'Classmate',
  'Coworker',
  'Roommate',
  'Travel Companion',
  'Pen Pal',
  'Online Friend',
  'Frenemy',
  'Rival',
  'Competitor',
  'Enemy',
  'Nemesis',
  'Adversary',
  'Opponent',
  'Betrayer',
  'Backstabber',
  'Turncoat',
  'Blackmailer',
  'Manipulator',
  'Obsession',
  'Stalker',
  'Hunter',
  'Target',
  'Protector',
  'Guardian',
  'Bodyguard',
  'Caretaker',
  'Dependent',
  'Rescuer',
  'Mentor',
  'Student',
  'Teacher',
  'Apprentice',
  'Master',
  'Protégé',
  'Guide',
  'Advisor',
  'Counselor',
  'Boss',
  'Employee',
  'Commander',
  'Officer',
  'Subordinate',
  'Leader',
  'Follower',
  'Handler',
  'Agent',
  'Client',
  'Contractor',
  'Patron',
  'Servant',
  'Lord',
  'Vassal',
  'King',
  'Queen',
  'Heir',
  'Subject',
  'Parent',
  'Child',
  'Mother',
  'Father',
  'Son',
  'Daughter',
  'Sibling',
  'Brother',
  'Sister',
  'Twin',
  'Cousin',
  'Aunt',
  'Uncle',
  'Niece',
  'Nephew',
  'Grandparent',
  'Grandchild',
  'Ancestor',
  'Descendant',
  'Step-Parent',
  'Step-Child',
  'Foster Parent',
  'Foster Child',
  'Godparent',
  'Godchild',
  'Spouse',
  'Husband',
  'Wife',
  'Fiancé',
  'Fiancée',
  'Lover',
  'Beloved',
  'Romantic Interest',
  'Crush',
  'Secret Crush',
  'Ex-Lover',
  'Ex-Partner',
  'Soulmate',
  'Forbidden Love',
  'Arranged Spouse',
  'Suitor',
  'Admirer',
  'Muse',
  'Captor',
  'Captive',
  'Jailer',
  'Prisoner',
  'Kidnapper',
  'Hostage',
  'Debtor',
  'Creditor',
  'Benefactor',
  'Sponsor',
  'Investor',
  'Supplier',
  'Smuggler',
  'Fixer',
  'Fence',
  'Informant',
  'Witness',
  'Suspect',
  'Detective',
  'Investigator',
  'Sheriff',
  'Outlaw',
  'Bounty Hunter',
  'Mercenary',
  'Body Double',
  'Double Agent',
  'Mole',
  'Conspirator',
  'Cultist',
  'Priest',
  'Disciple',
  'Prophet',
  'Oracle',
  'Champion',
  'Chosen One',
  'Herald',
  'Summoner',
  'Familiar',
  'Spirit Guide',
  'Demon Pact',
  'Vampire Sire',
  'Packmate',
  'Coven Member',
  'Guardian Spirit',
  'Creator',
  'Creation',
  'Inventor',
  'Experiment',
  'Pilot',
  'Co-Pilot',
  'Crewmate',
  'Captain',
  'Navigator',
  'Scavenger',
  'Raider',
  'Survival Partner',
  'Warlord',
  'Rebel',
  'Revolutionary',
  'Diplomat',
  'Political Ally',
  'Political Rival',
  'Courtier',
  'Royal Advisor',
  'Handler Contact',
  'Inside Man',
  'Wheelman',
  'Safecracker',
  'Getaway Driver',
  'Hitman',
  'Mark',
  'Treasure Hunter',
  'Guide Scout',
  'Explorer',
  'Ritual Bond',
  'Sworn Enemy',
  'Sworn Brother',
  'Sworn Sister',
  'Blood Oath',
  'Life Debt',
  'Protegé Rival',
  'Caretaker Rival',
  'Family Friend',
  'Household Retainer',
];

export const THEME_RELATIONSHIP_KINDS: Record<NarrativeTheme, Array<{ value: RelationshipKind; label: string }>> = {
  Fantasy: [
    { value: 'ally', label: 'Ally' },
    { value: 'rival', label: 'Rival' },
    { value: 'family', label: 'Family' },
    { value: 'mentor', label: 'Mentor' },
    { value: 'protective', label: 'Protective' },
    { value: 'authority', label: 'Lord/Vassal' },
    { value: 'custom', label: 'Sworn Enemy' },
    { value: 'custom', label: 'Courtesan' },
    { value: 'custom', label: 'Guild Brother' },
    { value: 'custom', label: 'Ritual Bond' },
  ],
  Noir: [
    { value: 'ally', label: 'Ally' },
    { value: 'rival', label: 'Rival' },
    { value: 'romance', label: 'Femme Fatale' },
    { value: 'custom', label: 'Suspect' },
    { value: 'custom', label: 'Informant' },
    { value: 'custom', label: 'Corrupt Cop' },
    { value: 'custom', label: 'Mob Contact' },
    { value: 'betrayal', label: 'Betrayer' },
    { value: 'debt', label: 'Owes Favors' },
    { value: 'obsession', label: 'Obsession' },
  ],
  Romance: [
    { value: 'romance', label: 'Lover' },
    { value: 'ally', label: 'Supportive Friend' },
    { value: 'rival', label: 'Rival Suitor' },
    { value: 'family', label: 'Ex-Partner' },
    { value: 'custom', label: 'First Love' },
    { value: 'custom', label: 'Forbidden Love' },
    { value: 'custom', label: 'Arranged Spouse' },
    { value: 'obsession', label: 'Stalker' },
    { value: 'custom', label: 'Matchmaker' },
    { value: 'custom', label: 'Love Triangle' },
  ],
  Cyberpunk: [
    { value: 'ally', label: 'Netrunner Partner' },
    { value: 'rival', label: 'Corporate Rival' },
    { value: 'authority', label: 'Corpo Handler' },
    { value: 'custom', label: 'Fixer Client' },
    { value: 'custom', label: 'Street Doc' },
    { value: 'custom', label: 'Data Thief' },
    { value: 'betrayal', label: 'Corporate Spy' },
    { value: 'custom', label: 'Augmented Gang' },
    { value: 'obsession', label: 'Tech Obsessed' },
    { value: 'custom', label: 'Black Market Contact' },
  ],
  Horror: [
    { value: 'ally', label: 'Survivor' },
    { value: 'rival', label: 'Hunter' },
    { value: 'custom', label: 'Possessed' },
    { value: 'custom', label: 'Cultist' },
    { value: 'custom', label: 'The Monster' },
    { value: 'family', label: 'Cursed Bloodline' },
    { value: 'custom', label: 'Ghost' },
    { value: 'custom', label: 'Vampire Sire' },
    { value: 'obsession', label: 'Serial Killer' },
    { value: 'custom', label: 'Final Girl' },
  ],
  Mystery: [
    { value: 'ally', label: 'Detective Partner' },
    { value: 'custom', label: 'Suspect' },
    { value: 'custom', label: 'Witness' },
    { value: 'rival', label: 'Rival Investigator' },
    { value: 'custom', label: 'The Killer' },
    { value: 'custom', label: 'Informant' },
    { value: 'custom', label: 'Red Herring' },
    { value: 'authority', label: 'Police Chief' },
    { value: 'custom', label: 'Forensic Expert' },
    { value: 'custom', label: 'Confidential Source' },
  ],
  'Sci-Fi': [
    { value: 'ally', label: 'Crew Member' },
    { value: 'rival', label: 'Enemy Alien' },
    { value: 'authority', label: 'Commander' },
    { value: 'custom', label: 'Android Servant' },
    { value: 'custom', label: 'Space Pirate' },
    { value: 'custom', label: 'Colony Leader' },
    { value: 'mentor', label: 'AI Guide' },
    { value: 'custom', label: 'Experiment Subject' },
    { value: 'custom', label: 'Void Entity' },
    { value: 'custom', label: 'Corporate Exec' },
  ],
  Crime: [
    { value: 'ally', label: 'Crew Member' },
    { value: 'rival', label: 'Rival Mobster' },
    { value: 'authority', label: 'The Boss' },
    { value: 'custom', label: 'Getaway Driver' },
    { value: 'custom', label: 'Safe Cracker' },
    { value: 'custom', label: 'Fixer' },
    { value: 'custom', label: 'Informant' },
    { value: 'betrayal', label: 'Rat' },
    { value: 'debt', label: 'Owes Money' },
    { value: 'custom', label: 'Hitman' },
  ],
  Political: [
    { value: 'ally', label: 'Political Ally' },
    { value: 'rival', label: 'Political Rival' },
    { value: 'authority', label: 'Monarch/King' },
    { value: 'custom', label: 'Senator' },
    { value: 'custom', label: 'Revolutionary' },
    { value: 'custom', label: 'Spy' },
    { value: 'mentor', label: 'Power Broker' },
    { value: 'custom', label: 'Diplomat' },
    { value: 'custom', label: 'Propagandist' },
    { value: 'custom', label: 'Advisor' },
  ],
  War: [
    { value: 'ally', label: 'Comrade' },
    { value: 'rival', label: 'Enemy Soldier' },
    { value: 'authority', label: 'General' },
    { value: 'family', label: 'War Buddy' },
    { value: 'custom', label: 'Deserter' },
    { value: 'custom', label: 'Medic' },
    { value: 'custom', label: 'Spy' },
    { value: 'custom', label: 'Prisoner' },
    { value: 'custom', label: 'Occupier' },
    { value: 'custom', label: 'Resistance Leader' },
  ],
  Spy: [
    { value: 'ally', label: 'Handler' },
    { value: 'rival', label: 'Enemy Agent' },
    { value: 'authority', label: 'Agency Director' },
    { value: 'custom', label: 'Double Agent' },
    { value: 'custom', label: 'Mole' },
    { value: 'custom', label: 'Asset' },
    { value: 'custom', label: 'Informant' },
    { value: 'betrayal', label: 'Turncoat' },
    { value: 'obsession', label: 'Target' },
    { value: 'custom', label: 'Dead Drop Contact' },
  ],
  Heist: [
    { value: 'ally', label: 'Crew Member' },
    { value: 'rival', label: 'Rival Thief' },
    { value: 'authority', label: 'Mastermind' },
    { value: 'custom', label: 'Wheelman' },
    { value: 'custom', label: 'Safecracker' },
    { value: 'custom', label: 'Infiltrator' },
    { value: 'custom', label: 'The Muscle' },
    { value: 'custom', label: 'Fence' },
    { value: 'custom', label: 'Mark' },
    { value: 'custom', label: 'Inside Man' },
  ],
  Supernatural: [
    { value: 'ally', label: 'Hunter Ally' },
    { value: 'rival', label: 'Hunter Nemesis' },
    { value: 'custom', label: 'Vampire Sire' },
    { value: 'custom', label: 'Demon Pact' },
    { value: 'custom', label: 'Werewolf Pack' },
    { value: 'custom', label: 'Witch Coven' },
    { value: 'family', label: 'Cursed Lineage' },
    { value: 'mentor', label: 'Spirit Guide' },
    { value: 'custom', label: 'Exorcist' },
    { value: 'custom', label: 'Dark Entity' },
  ],
  'Post-Apocalyptic': [
    { value: 'ally', label: 'Survival Partner' },
    { value: 'rival', label: 'Raider' },
    { value: 'custom', label: 'Warlord' },
    { value: 'custom', label: 'Scavenger' },
    { value: 'custom', label: 'Tribe Member' },
    { value: 'family', label: 'Last Family' },
    { value: 'custom', label: 'Mutant' },
    { value: 'custom', label: 'Vault Dweller' },
    { value: 'custom', label: 'Rad-Healer' },
    { value: 'custom', label: 'Trader' },
  ],
  Dystopian: [
    { value: 'ally', label: 'Resistance Member' },
    { value: 'rival', label: 'Enforcer' },
    { value: 'authority', label: 'The Party Leader' },
    { value: 'custom', label: 'Citizen' },
    { value: 'custom', label: 'Sub-Citizen' },
    { value: 'custom', label: 'Propagandist' },
    { value: 'custom', label: 'Information Dealer' },
    { value: 'custom', label: 'Dissident' },
    { value: 'custom', label: 'Thought Police' },
    { value: 'custom', label: 'Re-education Target' },
  ],
  Epic: [
    { value: 'ally', label: 'Chosen One' },
    { value: 'rival', label: 'Dark Lord' },
    { value: 'authority', label: 'King/Emperor' },
    { value: 'family', label: 'Demigod Lineage' },
    { value: 'mentor', label: 'Sage/Mentor' },
    { value: 'custom', label: 'Prophecy Hero' },
    { value: 'custom', label: 'Dragon Rider' },
    { value: 'custom', label: 'Ancient Dragon' },
    { value: 'custom', label: 'Herald' },
    { value: 'custom', label: 'Fate Weaver' },
  ],
  Mythology: [
    { value: 'ally', label: 'Divine Ally' },
    { value: 'rival', label: 'Godly Rival' },
    { value: 'authority', label: 'Olympians' },
    { value: 'family', label: 'Divine Bloodline' },
    { value: 'custom', label: 'Titan' },
    { value: 'custom', label: 'Oracle' },
    { value: 'custom', label: 'Monster' },
    { value: 'custom', label: 'Hero' },
    { value: 'custom', label: 'Guardian' },
    { value: 'custom', label: 'Soul Guide' },
  ],
  Family: [
    { value: 'family', label: 'Parent' },
    { value: 'family', label: 'Child' },
    { value: 'family', label: 'Sibling' },
    { value: 'family', label: 'Extended Family' },
    { value: 'ally', label: 'Protective' },
    { value: 'rival', label: 'Black Sheep' },
    { value: 'custom', label: 'Black Sheep' },
    { value: 'custom', label: 'Step-Parent' },
    { value: 'custom', label: 'Foster Child' },
    { value: 'custom', label: 'Godparent' },
  ],
  Drama: [
    { value: 'family', label: 'Family Member' },
    { value: 'ally', label: 'Confidant' },
    { value: 'rival', label: 'Rival' },
    { value: 'custom', label: 'Scandal Maker' },
    { value: 'custom', label: 'Blackmailer' },
    { value: 'custom', label: 'Social Climber' },
    { value: 'mentor', label: 'Mentor' },
    { value: 'custom', label: 'Fallen Hero' },
    { value: 'custom', label: 'Secret Keeper' },
    { value: 'custom', label: 'Frenemy' },
  ],
  Comedy: [
    { value: 'ally', label: 'Sidekick' },
    { value: 'rival', label: 'Rival' },
    { value: 'custom', label: 'Mischief Maker' },
    { value: 'custom', label: 'Butt of Jokes' },
    { value: 'custom', label: 'Clumsy Hero' },
    { value: 'custom', label: 'Straight Man' },
    { value: 'family', label: 'Embarrassing Relative' },
    { value: 'custom', label: 'Town Eccentric' },
    { value: 'custom', label: 'Rival Fool' },
    { value: 'custom', label: 'Lucky Unlucky' },
  ],
  Historical: [
    { value: 'family', label: 'Noble Lineage' },
    { value: 'authority', label: 'Lord/Lady' },
    { value: 'ally', label: 'Ally' },
    { value: 'rival', label: 'Rival House' },
    { value: 'custom', label: 'Royal Advisor' },
    { value: 'custom', label: 'Courtier' },
    { value: 'custom', label: 'Peasant Rebel' },
    { value: 'custom', label: 'Mercenary' },
    { value: 'mentor', label: 'Master Artisan' },
    { value: 'custom', label: 'Religious Figure' },
  ],
  Western: [
    { value: 'ally', label: 'Partner' },
    { value: 'rival', label: 'Outlaw' },
    { value: 'authority', label: 'Sheriff' },
    { value: 'custom', label: 'Bounty Hunter' },
    { value: 'custom', label: 'Prospector' },
    { value: 'custom', label: 'Drifter' },
    { value: 'custom', label: 'Saloon Owner' },
    { value: 'custom', label: 'Railroad Baron' },
    { value: 'custom', label: 'Native American Ally' },
    { value: 'custom', label: 'Stagecoach Driver' },
  ],
  Adventure: [
    { value: 'ally', label: 'Expedition Mate' },
    { value: 'rival', label: 'Rival Explorer' },
    { value: 'custom', label: 'Treasure Hunter' },
    { value: 'custom', label: 'Guide' },
    { value: 'custom', label: 'Map Keeper' },
    { value: 'custom', label: 'Beast Tamer' },
    { value: 'mentor', label: 'Old Explorer' },
    { value: 'custom', label: 'Native Ally' },
    { value: 'custom', label: 'Lost Heir' },
    { value: 'custom', label: 'Ancient Order' },
  ],
  Thriller: [
    { value: 'ally', label: 'Protector' },
    { value: 'rival', label: 'Target' },
    { value: 'custom', label: 'Kidnapper' },
    { value: 'custom', label: 'Hostage' },
    { value: 'custom', label: 'Profiler' },
    { value: 'custom', label: 'Negotiator' },
    { value: 'authority', label: 'Handler' },
    { value: 'custom', label: 'Whistleblower' },
    { value: 'custom', label: 'Assassin' },
    { value: 'custom', label: 'Conspiracy Member' },
  ],
  'Slice-of-Life': [
    { value: 'family', label: 'Family' },
    { value: 'ally', label: 'Best Friend' },
    { value: 'rival', label: 'Friendly Rival' },
    { value: 'custom', label: 'Coworker' },
    { value: 'custom', label: 'Neighbor' },
    { value: 'custom', label: 'Classmate' },
    { value: 'custom', label: 'Barista' },
    { value: 'custom', label: 'Online Friend' },
    { value: 'custom', label: 'Ex-Partner' },
    { value: 'custom', label: 'Mentor Figure' },
  ],
  'Coming-of-Age': [
    { value: 'family', label: 'Parent' },
    { value: 'family', label: 'Sibling' },
    { value: 'ally', label: 'Best Friend' },
    { value: 'rival', label: 'Bully' },
    { value: 'mentor', label: 'Guidance Counselor' },
    { value: 'custom', label: 'First Love' },
    { value: 'custom', label: 'Rebel Leader' },
    { value: 'custom', label: 'Academic Rival' },
    { value: 'custom', label: 'Dreams Crush' },
    { value: 'custom', label: 'Future Self' },
  ],
  Utopian: [
    { value: 'ally', label: 'Citizen Ally' },
    { value: 'family', label: 'Unit Family' },
    { value: 'custom', label: 'Harmony Keeper' },
    { value: 'custom', label: 'Dissenter' },
    { value: 'custom', label: 'Perfection Seeker' },
    { value: 'custom', label: 'Utopia Builder' },
    { value: 'custom', label: 'Legacy Child' },
    { value: 'custom', label: 'Memory Keeper' },
    { value: 'custom', label: 'Joy Bringer' },
    { value: 'custom', label: 'Hidden Flaw' },
  ],
};

export interface Character {
  id: string;
  name: string;
  personality: string;
  backstory?: string;
  isPresent: boolean;
  // additional properties for richer profiles
  theme?: string;
  race?: string;
  profession?: string;
  alignment?: string;
  background?: string;
  age?: string;
  gender?: string;
  // narrative designer fields
  magicSystem?: string;
  socialStanding?: string;
  powerSource?: string;
  vibe?: string;
  paradox?: string;
}

export interface CharacterAttributes {
  races: string[];
  professions: string[];
  alignments: string[];
  personalityTraits: string[];
  backgrounds: string[];
  magicSystems: string[];
  socialStandings: string[];
  powerSources: string[];
  vibes: string[];
  paradoxes: string[];
}

export interface PlayerProfile {
  name: string;
  role: string;
  persona: string;
  objective: string;
  playingAsCharacterId?: string;
}

export interface ContentSafetySettings {
  explicitMode: 'fade-to-black' | 'allow';
  vulgarityLevel: 'low' | 'medium' | 'high' | 'extreme';
  blurExplicitContent: boolean;
  showExplicitBadges: boolean;
}

export type RelationshipVisibility = 'public' | 'private' | 'secret';

export interface CharacterRelationship {
  id: string;
  sourceCharacterId: string;
  targetCharacterId: string;
  kind: RelationshipKind;
  reciprocal?: boolean;
  reverseKind?: RelationshipKind;
  intensity: number;
  visibility: RelationshipVisibility;
  notes?: string;
}

export interface StoryFlowChange {
  id: string;
  timestamp: number;
  category: 'scene' | 'player' | 'character' | 'relationship' | 'safety' | 'turns';
  summary: string;
}

export interface StoryFlowState {
  setupDigest: string;
  activeGuidance: string[];
  pendingChanges: StoryFlowChange[];
  recentChanges: StoryFlowChange[];
  lastSignature: string;
  lastUpdated: number;
  storyMemoryDigest?: string;
  qualityAnalysis?: {
    narrativePath: string;
    conversationVelocity: number;
    stalledTopics: string[];
    recommendedPrompts: string[];
    bottleneckCharacters: string[];
  };
}

export interface SceneEvent {
  id: string;
  description: string;
  involvedCharacters: string[];
  type: 'action' | 'dialogue' | 'event';
}

export const NARRATIVE_THEMES: NarrativeTheme[] = [
  'Family',
  'Romance',
  'Mystery',
  'Adventure',
  'Drama',
  'Comedy',
  'Horror',
  'Sci-Fi',
  'Historical',
  'Fantasy',
  'Western',
  'Cyberpunk',
  'Noir',
  'Thriller',
  'Supernatural',
  'Post-Apocalyptic',
  'Dystopian',
  'Utopian',
  'Crime',
  'Political',
  'Slice-of-Life',
  'Coming-of-Age',
  'Epic',
  'War',
  'Spy',
  'Heist',
  'Mythology',
];

export type ConversationMode = 'tele' | 'presence';

export type MemoryEntryType = 'event' | 'fact' | 'character_development' | 'relationship_change' | 'plot_point' | 'location_change' | 'important_detail';

export interface StoryMemoryEntry {
  id: string;
  type: MemoryEntryType;
  content: string;
  timestamp: number;
  characterIds?: string[];
  importance: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  emotionalTone?: 'happy' | 'angry' | 'sad' | 'tense' | 'romantic' | 'neutral';
  sequencePosition?: number;
  previousEventId?: string;
}

export interface StoryMemory {
  entries: StoryMemoryEntry[];
}

export interface StoryRevelationBeat {
  id: string;
  triggerCondition: string;
  revealTo: string[];
  content: string;
  isRevealed: boolean;
  revealedAt?: number;
}

export interface CharacterKnowledgeState {
  characterId: string;
  knownSecrets: string[];
  knownRelationships: string[];
  discoveredFacts: string[];
}

export interface StoryRevelations {
  beats: StoryRevelationBeat[];
  characterKnowledge: CharacterKnowledgeState[];
}

export interface CharacterSecret {
  id: string;
  content: string;
  sourceEntryId?: string;
  discoveredAt: number;
  discoveredFrom?: string;
  trustLevel: number;
  isBelieved: boolean;
}

export interface CharacterObservation {
  id: string;
  content: string;
  entryId?: string;
  timestamp: number;
  emotionalImpact: 'positive' | 'negative' | 'neutral';
  involvedCharacters: string[];
}

export interface CharacterKnownRelationship {
  targetCharacterId: string;
  kind: string;
  knownSince: number;
  isDirectlyObserved: boolean;
  sourceOfKnowledge?: string;
}

export interface CharacterKnowledgeLevel {
  knowledgeScore: number;
  understoodPlotPoints: string[];
  misconceptions: string[];
  lastUpdated: number;
}

export interface CharacterAgent {
  characterId: string;
  knownFacts: string[];
  secretsKnown: CharacterSecret[];
  relationships: CharacterKnownRelationship[];
  observations: CharacterObservation[];
  emotionalMemory: { eventId: string; emotion: string; intensity: number }[];
  knowledgeLevel: CharacterKnowledgeLevel;
  lastSyncTimestamp: number;
}

export interface CharacterAgentState {
  agents: Record<string, CharacterAgent>;
  lastGlobalSync: number;
}

export interface SceneContext {
  location: string;
  sceneTime?: string;
  plot: string;
  theme?: string;
  conversationMode?: ConversationMode;
  characters: Character[];
  relationships?: CharacterRelationship[];
  playerProfile?: PlayerProfile;
  contentSafety?: ContentSafetySettings;
  summary?: string;
  events?: string[];
  structuredEvents?: SceneEvent[];
  maxTurnsPerResponse?: number;
  autoTurnOrder?: 'sequential' | 'random' | 'manual';
  storyFlow?: StoryFlowState;
  storyMemory?: StoryMemory;
  storyRevelations?: StoryRevelations;
  characterAgents?: CharacterAgent[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  characterName?: string;
  isHidden?: boolean;
  actionText?: string;
  isDirectMessage?: boolean;
  visibleTo?: string[];
}

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'mistral' | 'groq';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface SavedSession {
  id: string;
  name: string;
  timestamp: number;
  context: SceneContext;
  messages: Message[];
  aiConfig?: AIConfig;
}

export interface SavedStory {
  id: string;
  name: string;
  timestamp: number;
  prompt: string;
  context: SceneContext;
}
