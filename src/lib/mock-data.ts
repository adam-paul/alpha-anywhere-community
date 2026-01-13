import type { Game, UserContext, Student, Conversation, Message } from './types';

// Mock games across all engagement categories
export const MOCK_GAMES: Game[] = [
  // Side-by-Side (Rung 1) - Solo play near others
  {
    id: 'bee-swarm',
    title: 'Bee Swarm Simulator',
    thumbnailUrl: '/thumbnails/bee-swarm.svg',
    type: 'roblox',
    engagementCategory: 'side-by-side',
    currentPlayers: 8,
    launchUrl: 'roblox://placeId=1537690962',
    description: 'Build your bee army and collect pollen'
  },
  {
    id: 'adopt-me',
    title: 'Adopt Me!',
    thumbnailUrl: '/thumbnails/adopt-me.svg',
    type: 'roblox',
    engagementCategory: 'side-by-side',
    currentPlayers: 12,
    launchUrl: 'roblox://placeId=920587237',
    description: 'Raise and collect adorable pets'
  },

  // Town Square (Rung 2) - Unstructured hangout
  {
    id: 'brookhaven',
    title: 'Brookhaven',
    thumbnailUrl: '/thumbnails/brookhaven.svg',
    type: 'roblox',
    engagementCategory: 'town-square',
    currentPlayers: 15,
    launchUrl: 'roblox://placeId=4924922222',
    description: 'Live your dream life in a cozy town'
  },
  {
    id: 'bloxburg',
    title: 'Welcome to Bloxburg',
    thumbnailUrl: '/thumbnails/bloxburg.svg',
    type: 'roblox',
    engagementCategory: 'town-square',
    currentPlayers: 6,
    launchUrl: 'roblox://placeId=185655149',
    description: 'Build your dream home and hang out'
  },

  // Ice Breaker (Rung 3) - Short rounds, shared fate
  {
    id: 'natural-disaster',
    title: 'Natural Disaster Survival',
    thumbnailUrl: '/thumbnails/natural-disaster.svg',
    type: 'roblox',
    engagementCategory: 'ice-breaker',
    currentPlayers: 23,
    launchUrl: 'roblox://placeId=189707',
    description: 'Survive earthquakes, floods, and more together'
  },
  {
    id: 'regretevator',
    title: 'Regretevator',
    thumbnailUrl: '/thumbnails/regretevator.svg',
    type: 'roblox',
    engagementCategory: 'ice-breaker',
    currentPlayers: 18,
    launchUrl: 'roblox://placeId=12345678',
    description: 'Ride the elevator of chaos with friends'
  },

  // Trust Builder (Rung 4) - Cooperative play
  {
    id: 'pizza-place',
    title: 'Work at a Pizza Place',
    thumbnailUrl: '/thumbnails/pizza-place.svg',
    type: 'roblox',
    engagementCategory: 'trust-builder',
    currentPlayers: 9,
    launchUrl: 'roblox://placeId=192800',
    description: 'Run a pizza shop as a team'
  },
  {
    id: 'build-boat',
    title: 'Build A Boat For Treasure',
    thumbnailUrl: '/thumbnails/build-boat.svg',
    type: 'roblox',
    engagementCategory: 'trust-builder',
    currentPlayers: 11,
    launchUrl: 'roblox://placeId=537413528',
    description: 'Engineer boats together and find treasure'
  },

  // Rivalry (Rung 5) - Team competition
  {
    id: 'bedwars',
    title: 'BedWars',
    thumbnailUrl: '/thumbnails/bedwars.svg',
    type: 'roblox',
    engagementCategory: 'rivalry',
    currentPlayers: 31,
    launchUrl: 'roblox://placeId=6872265039',
    description: 'Protect your bed, destroy the enemy'
  },
  {
    id: 'arsenal',
    title: 'Arsenal',
    thumbnailUrl: '/thumbnails/arsenal.svg',
    type: 'roblox',
    engagementCategory: 'rivalry',
    currentPlayers: 27,
    launchUrl: 'roblox://placeId=286090429',
    description: 'Fast-paced team shooter action'
  }
];

// Mock user
export const MOCK_USER: UserContext = {
  id: 'user-001',
  displayName: 'Alex T.'
};

// Mock students for Explore page
export const MOCK_STUDENTS: Student[] = [
  {
    id: 'student-liam',
    displayName: 'Liam T.',
    handle: 'liam_t',
    avatarUrl: '/avatars/liam.svg',
    coverUrl: '/covers/green-abstract.svg',
    location: 'Fort Worth, TX',
    bio: 'A 12-year-old who enjoys robotics and building model airplanes. I also like to paint, listen to classical music and play with my dog Starky.',
    interests: ['robotics', 'painting', 'music', 'art'],
    joinedDate: 'Oct 2024',
    stats: {
      xpEarned: 1200,
      timebackHours: 10,
      dailyXpCurrent: 34,
      dailyXpGoal: 150
    },
    mutualFriendIds: ['student-sophia', 'student-noah']
  },
  {
    id: 'student-sophia',
    displayName: 'Sophia J.',
    handle: 'sophia_j',
    avatarUrl: '/avatars/sophia.svg',
    coverUrl: '/covers/pink-abstract.svg',
    location: 'Austin, TX',
    bio: 'An 11-year-old who loves music and plays the piano. I also enjoy performing arts and dancing with my friends.',
    interests: ['piano', 'theatre', 'music', 'dance', 'guitar', 'drawing'],
    joinedDate: 'Sep 2024',
    stats: {
      xpEarned: 980,
      timebackHours: 8,
      dailyXpCurrent: 120,
      dailyXpGoal: 120
    },
    mutualFriendIds: ['student-liam', 'student-jamie']
  },
  {
    id: 'student-noah',
    displayName: 'Noah P.',
    handle: 'noah_p',
    avatarUrl: '/avatars/noah.svg',
    coverUrl: '/covers/blue-abstract.svg',
    location: 'San Francisco, CA',
    bio: "Hi, I'm Noah! I love hiking, watching documentaries with my dad and playing with dinosaur toys.",
    interests: ['hiking', 'documentaries', 'dinosaurs'],
    joinedDate: 'Nov 2024',
    stats: {
      xpEarned: 650,
      timebackHours: 5,
      dailyXpCurrent: 80,
      dailyXpGoal: 120
    },
    mutualFriendIds: ['student-liam', 'student-sam']
  },
  {
    id: 'student-jamie',
    displayName: 'Jamie S.',
    handle: 'jamie_s',
    avatarUrl: '/avatars/jamie.svg',
    coverUrl: '/covers/purple-abstract.svg',
    location: 'Austin, TX',
    bio: "Hey, I'm Jamie! I am 13 years old and I dream about becoming a famous astronomer.",
    interests: ['astronomy', 'geography', 'science'],
    joinedDate: 'Aug 2024',
    stats: {
      xpEarned: 1450,
      timebackHours: 12,
      dailyXpCurrent: 90,
      dailyXpGoal: 120
    },
    mutualFriendIds: ['student-sophia', 'student-oliver']
  },
  {
    id: 'student-oliver',
    displayName: 'Oliver C.',
    handle: 'oliver_c',
    avatarUrl: '/avatars/oliver.svg',
    coverUrl: '/covers/orange-abstract.svg',
    location: 'Scottsdale, AZ',
    bio: 'Oliver is a 12-year-old gaming lover, who is currently working on a video game concept with his friends.',
    interests: ['gaming', 'basketball', 'robotics', 'drawing'],
    joinedDate: 'Oct 2024',
    stats: {
      xpEarned: 890,
      timebackHours: 7,
      dailyXpCurrent: 110,
      dailyXpGoal: 120
    },
    mutualFriendIds: ['student-jamie', 'student-mia']
  },
  {
    id: 'student-mia',
    displayName: 'Mia G.',
    handle: 'mia_g',
    avatarUrl: '/avatars/mia.svg',
    coverUrl: '/covers/teal-abstract.svg',
    location: 'Lake Forest, CA',
    bio: "Hi all, I'm Mia! I enjoy reading, especially fantasy and sci-fi. I also love movies and acting.",
    interests: ['drama', 'books', 'movies'],
    joinedDate: 'Sep 2024',
    stats: {
      xpEarned: 1100,
      timebackHours: 9,
      dailyXpCurrent: 60,
      dailyXpGoal: 120
    },
    mutualFriendIds: ['student-oliver', 'student-michael']
  },
  {
    id: 'student-michael',
    displayName: 'Michael L.',
    handle: 'michael_l',
    avatarUrl: '/avatars/michael.svg',
    coverUrl: '/covers/red-abstract.svg',
    location: 'Austin, TX',
    bio: "Hey, I'm Michael and I want to become a professional chef someday. I enjoy baking and cooking with my mom.",
    interests: ['baking', 'cooking'],
    joinedDate: 'Nov 2024',
    stats: {
      xpEarned: 520,
      timebackHours: 4,
      dailyXpCurrent: 45,
      dailyXpGoal: 120
    },
    mutualFriendIds: ['student-mia', 'student-john']
  },
  {
    id: 'student-john',
    displayName: 'John L.',
    handle: 'john_l',
    avatarUrl: '/avatars/john.svg',
    coverUrl: '/covers/yellow-abstract.svg',
    location: 'Austin, TX',
    bio: 'John enjoys playing all kinds of sports, especially tennis and basketball. He is the captain of his local tennis team.',
    interests: ['tennis', 'basketball'],
    joinedDate: 'Oct 2024',
    stats: {
      xpEarned: 780,
      timebackHours: 6,
      dailyXpCurrent: 100,
      dailyXpGoal: 120
    },
    mutualFriendIds: ['student-michael', 'student-sam']
  },
  {
    id: 'student-sam',
    displayName: 'Sam J.',
    handle: 'sam_j',
    avatarUrl: '/avatars/sam.svg',
    coverUrl: '/covers/green-gradient.svg',
    location: 'Austin, TX',
    bio: "Hey, I'm Sam, a big nature lover, who enjoys hiking on weekends with my family and reading adventure books.",
    interests: ['hiking', 'geography', 'books'],
    joinedDate: 'Sep 2024',
    stats: {
      xpEarned: 920,
      timebackHours: 8,
      dailyXpCurrent: 115,
      dailyXpGoal: 120
    },
    mutualFriendIds: ['student-noah', 'student-john']
  }
];

// Helper to create dates relative to now
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function hoursAgo(hours: number): Date {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}

function minutesAgo(minutes: number): Date {
  const date = new Date();
  date.setMinutes(date.getMinutes() - minutes);
  return date;
}

// Mock conversations
export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    name: undefined, // Group chat, will show participant names
    participantIds: ['student-noah', 'student-sophia'],
    lastMessage: {
      content: 'Thank you',
      senderId: 'student-noah',
      timestamp: minutesAgo(5)
    },
    unreadCount: 0,
    isMuted: false
  },
  {
    id: 'conv-2',
    participantIds: ['student-noah'],
    lastMessage: {
      content: 'Yes for sure',
      senderId: 'me',
      timestamp: minutesAgo(10)
    },
    unreadCount: 0,
    isMuted: false
  },
  {
    id: 'conv-3',
    participantIds: ['student-liam'],
    lastMessage: {
      content: 'Hey!! How was your day?',
      senderId: 'student-liam',
      timestamp: hoursAgo(2)
    },
    unreadCount: 1,
    isMuted: false
  },
  {
    id: 'conv-4',
    participantIds: ['student-sophia', 'student-noah'],
    lastMessage: {
      content: 'Yes!!',
      senderId: 'me',
      timestamp: hoursAgo(3)
    },
    unreadCount: 0,
    isMuted: false
  },
  {
    id: 'conv-5',
    name: 'Math Study Group',
    participantIds: ['student-jamie', 'student-oliver', 'student-mia'],
    lastMessage: {
      content: 'When was that??',
      senderId: 'student-jamie',
      timestamp: daysAgo(1)
    },
    unreadCount: 0,
    isMuted: false
  },
  {
    id: 'conv-6',
    participantIds: ['student-jamie'],
    lastMessage: {
      content: 'I will check it out!',
      senderId: 'student-jamie',
      timestamp: daysAgo(1)
    },
    unreadCount: 0,
    isMuted: false
  },
  {
    id: 'conv-7',
    participantIds: ['student-oliver'],
    lastMessage: {
      content: "It's Monday!!!",
      senderId: 'student-oliver',
      timestamp: daysAgo(2)
    },
    unreadCount: 0,
    isMuted: true
  },
  {
    id: 'conv-8',
    participantIds: ['student-sam'],
    lastMessage: {
      content: 'Sounds great!',
      senderId: 'me',
      timestamp: daysAgo(2)
    },
    unreadCount: 0,
    isMuted: false
  }
];

// Mock messages for conversations
export const MOCK_MESSAGES: Record<string, Message[]> = {
  'conv-1': [
    {
      id: 'msg-1-1',
      conversationId: 'conv-1',
      senderId: 'me',
      content: 'Hey Guys',
      timestamp: minutesAgo(30)
    },
    {
      id: 'msg-1-2',
      conversationId: 'conv-1',
      senderId: 'me',
      content: 'Math paper for the weekend',
      imageUrl: '/images/math-paper.png',
      timestamp: minutesAgo(28)
    },
    {
      id: 'msg-1-3',
      conversationId: 'conv-1',
      senderId: 'student-noah',
      content: 'Thank you',
      timestamp: minutesAgo(5),
      reactions: ['❤️']
    }
  ],
  'conv-2': [
    {
      id: 'msg-2-1',
      conversationId: 'conv-2',
      senderId: 'student-noah',
      content: 'Hey! Did you finish the science project?',
      timestamp: hoursAgo(1)
    },
    {
      id: 'msg-2-2',
      conversationId: 'conv-2',
      senderId: 'me',
      content: 'Almost done! Just need to add the conclusion',
      timestamp: minutesAgo(45)
    },
    {
      id: 'msg-2-3',
      conversationId: 'conv-2',
      senderId: 'student-noah',
      content: 'Nice! Want to compare notes tomorrow?',
      timestamp: minutesAgo(30)
    },
    {
      id: 'msg-2-4',
      conversationId: 'conv-2',
      senderId: 'me',
      content: 'Yes for sure',
      timestamp: minutesAgo(10)
    }
  ],
  'conv-3': [
    {
      id: 'msg-3-1',
      conversationId: 'conv-3',
      senderId: 'me',
      content: 'Hi Liam!',
      timestamp: daysAgo(1)
    },
    {
      id: 'msg-3-2',
      conversationId: 'conv-3',
      senderId: 'student-liam',
      content: 'Hey! What are you up to?',
      timestamp: daysAgo(1)
    },
    {
      id: 'msg-3-3',
      conversationId: 'conv-3',
      senderId: 'me',
      content: 'Just finished my robotics project!',
      timestamp: hoursAgo(5)
    },
    {
      id: 'msg-3-4',
      conversationId: 'conv-3',
      senderId: 'student-liam',
      content: 'Hey!! How was your day?',
      timestamp: hoursAgo(2)
    }
  ],
  'conv-5': [
    {
      id: 'msg-5-1',
      conversationId: 'conv-5',
      senderId: 'student-oliver',
      content: 'Anyone want to study for the math test?',
      timestamp: daysAgo(3)
    },
    {
      id: 'msg-5-2',
      conversationId: 'conv-5',
      senderId: 'me',
      content: 'Yes! I need help with chapter 5',
      timestamp: daysAgo(3)
    },
    {
      id: 'msg-5-3',
      conversationId: 'conv-5',
      senderId: 'student-mia',
      content: 'I can help with that! When are you free?',
      timestamp: daysAgo(2)
    },
    {
      id: 'msg-5-4',
      conversationId: 'conv-5',
      senderId: 'student-jamie',
      content: 'When was that??',
      timestamp: daysAgo(1)
    }
  ]
};
