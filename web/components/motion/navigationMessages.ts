export interface NavigationDisplay {
  destination: string
  headline: string
  tagline: string
  statusMessages: string[]
}

const DEFAULT_MESSAGES = [
  'Aligning data streams…',
  'Warming up the instruments…',
  'Almost there — good science takes a moment.',
]

const ROUTE_DISPLAY: Record<string, Omit<NavigationDisplay, 'destination'> & { destination?: string }> = {
  '/dashboard': {
    destination: 'Dashboard',
    headline: 'Mission Control',
    tagline: 'Your experiment overview is on the way.',
    statusMessages: [
      'Aggregating build metrics…',
      'Charting phase progress…',
      'Preparing your research snapshot…',
    ],
  },
  '/builds': {
    destination: 'Builds',
    headline: 'The Lab Archive',
    tagline: 'Every experiment tells a story.',
    statusMessages: [
      'Indexing active builds…',
      'Loading phase summaries…',
      'Opening the experiment library…',
    ],
  },
  '/account': {
    destination: 'Account',
    headline: 'Your Profile',
    tagline: 'Credentials, preferences, identity — all in one place.',
    statusMessages: [
      'Fetching profile details…',
      'Securing your session…',
    ],
  },
}

const SEGMENT_DISPLAY: Array<{
  match: RegExp
  resolve: (pathname: string) => Omit<NavigationDisplay, 'destination'> & { destination: string }
}> = [
  {
    match: /^\/builds\/[^/]+\/data$/,
    resolve: () => ({
      destination: 'Experiment Data',
      headline: 'Data Vault',
      tagline: 'Artifacts, notes, and phase records — organized and ready.',
      statusMessages: [
        'Mounting phase panels…',
        'Syncing artifact metadata…',
        'Unpacking your datasets…',
      ],
    }),
  },
  {
    match: /^\/builds\/[^/]+\/visualizations\/compare$/,
    resolve: () => ({
      destination: 'Phase Compare',
      headline: 'Side-by-Side Science',
      tagline: 'Cross-phase insights, loading now.',
      statusMessages: [
        'Aligning comparison axes…',
        'Rendering phase deltas…',
        'Building the contrast view…',
      ],
    }),
  },
  {
    match: /^\/builds\/[^/]+\/visualizations$/,
    resolve: () => ({
      destination: 'Visualizations',
      headline: 'Imaging Chamber',
      tagline: 'Turning raw data into something you can see.',
      statusMessages: [
        'Initializing viewers…',
        'Resolving artifact previews…',
        'Polishing the render pipeline…',
      ],
    }),
  },
  {
    match: /^\/builds\/[^/]+\/edit-log$/,
    resolve: () => ({
      destination: 'Edit Log',
      headline: 'Change Chronicle',
      tagline: 'Every edit, timestamped and traceable.',
      statusMessages: ['Replaying revision history…', 'Indexing changelog entries…'],
    }),
  },
  {
    match: /^\/builds\/[^/]+\/settings$/,
    resolve: () => ({
      destination: 'Build Settings',
      headline: 'Configuration Bay',
      tagline: 'Fine-tune this experiment\'s parameters.',
      statusMessages: ['Loading build configuration…', 'Applying workspace context…'],
    }),
  },
  {
    match: /^\/builds\/[^/]+$/,
    resolve: () => ({
      destination: 'Build Overview',
      headline: 'Experiment Hub',
      tagline: 'Status, phases, and progress — at a glance.',
      statusMessages: [
        'Pulling build overview…',
        'Mapping phase completion…',
        'Opening the command deck…',
      ],
    }),
  },
  {
    match: /^\/org\/[^/]+\/settings$/,
    resolve: () => ({
      destination: 'Organization',
      headline: 'Team Command',
      tagline: 'Members, invites, and org-wide settings.',
      statusMessages: ['Loading organization roster…', 'Syncing permissions…'],
    }),
  },
]

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function displayFromLegacyLabel(label: string): NavigationDisplay | null {
  const cleaned = label
    .replace(/^loading\s+/i, '')
    .replace(/[.…]+$/g, '')
    .trim()

  if (!cleaned) return null

  return {
    destination: titleCase(cleaned),
    headline: `Opening ${titleCase(cleaned)}`,
    tagline: 'Hang tight — we\'re getting things ready for you.',
    statusMessages: DEFAULT_MESSAGES,
  }
}

export function resolveNavigationDisplay(
  href: string,
  legacyLabel?: string
): NavigationDisplay {
  let pathname = href
  try {
    pathname = new URL(href, 'http://local').pathname
  } catch {
    // keep raw href
  }

  const normalized = pathname.replace(/\/$/, '') || '/'

  const exact = ROUTE_DISPLAY[normalized]
  if (exact) {
    return {
      destination: exact.destination ?? titleCase(normalized.slice(1)),
      headline: exact.headline,
      tagline: exact.tagline,
      statusMessages: exact.statusMessages,
    }
  }

  for (const entry of SEGMENT_DISPLAY) {
    if (entry.match.test(normalized)) {
      return entry.resolve(normalized)
    }
  }

  if (legacyLabel) {
    const fromLabel = displayFromLegacyLabel(legacyLabel)
    if (fromLabel) return fromLabel
  }

  const segment = normalized.split('/').filter(Boolean).pop() ?? 'page'
  const name = titleCase(segment.replace(/-/g, ' '))

  return {
    destination: name,
    headline: `Heading to ${name}`,
    tagline: 'Your workspace is loading.',
    statusMessages: DEFAULT_MESSAGES,
  }
}
