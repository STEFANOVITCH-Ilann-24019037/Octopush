// Mock data for GitHub clone

export const MOCK_CURRENT_USER = {
  id: 'u_001',
  username: 'octodev',
  name: 'Octo Developer',
  email: 'octo@dev.com',
  bio: 'Full-stack developer passionate about open source.',
  avatar: 'https://avatars.githubusercontent.com/u/9919?s=200&v=4',
  followers: 248,
  following: 76,
  location: 'Paris, France',
  company: '@emergent',
  website: 'https://octodev.io',
  joinedAt: '2021-03-12',
};

export const MOCK_REPOS = [
  {
    id: 'r_001',
    name: 'awesome-ui-kit',
    owner: 'octodev',
    description: 'A modern, accessible React UI kit built with Tailwind and Radix.',
    language: 'TypeScript',
    languageColor: '#3178c6',
    stars: 1284,
    forks: 142,
    watchers: 38,
    visibility: 'Public',
    updatedAt: '2025-07-08',
    isPinned: true,
    topics: ['react', 'ui-kit', 'tailwindcss', 'radix'],
    branch: 'main',
  },
  {
    id: 'r_002',
    name: 'fastapi-starter',
    owner: 'octodev',
    description: 'Production-ready FastAPI starter template with auth, JWT, MongoDB.',
    language: 'Python',
    languageColor: '#3572A5',
    stars: 562,
    forks: 73,
    watchers: 18,
    visibility: 'Public',
    updatedAt: '2025-06-29',
    isPinned: true,
    topics: ['fastapi', 'mongodb', 'jwt', 'python'],
    branch: 'main',
  },
  {
    id: 'r_003',
    name: 'dotfiles',
    owner: 'octodev',
    description: 'My personal dotfiles for macOS / Linux.',
    language: 'Shell',
    languageColor: '#89e051',
    stars: 42,
    forks: 6,
    watchers: 3,
    visibility: 'Public',
    updatedAt: '2025-05-14',
    isPinned: true,
    topics: ['zsh', 'tmux', 'neovim'],
    branch: 'main',
  },
  {
    id: 'r_004',
    name: 'react-charts',
    owner: 'octodev',
    description: 'Composable, animated chart components for React.',
    language: 'JavaScript',
    languageColor: '#f1e05a',
    stars: 318,
    forks: 27,
    watchers: 9,
    visibility: 'Public',
    updatedAt: '2025-04-22',
    isPinned: true,
    topics: ['react', 'charts', 'd3'],
    branch: 'main',
  },
  {
    id: 'r_005',
    name: 'private-notes',
    owner: 'octodev',
    description: 'Personal notes and snippets.',
    language: 'Markdown',
    languageColor: '#083fa1',
    stars: 0,
    forks: 0,
    watchers: 1,
    visibility: 'Private',
    updatedAt: '2025-07-10',
    isPinned: false,
    topics: [],
    branch: 'main',
  },
];

export const MOCK_TRENDING = [
  {
    id: 't_001',
    owner: 'vercel',
    name: 'next.js',
    description: 'The React Framework for the Web',
    language: 'JavaScript',
    languageColor: '#f1e05a',
    stars: 128432,
    starsToday: 312,
    avatar: 'https://avatars.githubusercontent.com/u/14985020?s=64&v=4',
  },
  {
    id: 't_002',
    owner: 'shadcn-ui',
    name: 'ui',
    description: 'Beautifully designed components built with Radix UI and Tailwind CSS.',
    language: 'TypeScript',
    languageColor: '#3178c6',
    stars: 76211,
    starsToday: 421,
    avatar: 'https://avatars.githubusercontent.com/u/139895814?s=64&v=4',
  },
  {
    id: 't_003',
    owner: 'tiangolo',
    name: 'fastapi',
    description: 'FastAPI framework, high performance, easy to learn.',
    language: 'Python',
    languageColor: '#3572A5',
    stars: 81203,
    starsToday: 198,
    avatar: 'https://avatars.githubusercontent.com/u/1326112?s=64&v=4',
  },
  {
    id: 't_004',
    owner: 'rust-lang',
    name: 'rust',
    description: 'Empowering everyone to build reliable and efficient software.',
    language: 'Rust',
    languageColor: '#dea584',
    stars: 96321,
    starsToday: 156,
    avatar: 'https://avatars.githubusercontent.com/u/5430905?s=64&v=4',
  },
];

export const MOCK_FEED = [
  {
    id: 'f_001',
    type: 'star',
    actor: 'octodev',
    target: 'vercel/next.js',
    targetDescription: 'The React Framework for the Web',
    language: 'JavaScript',
    languageColor: '#f1e05a',
    stars: 128432,
    when: '2 hours ago',
  },
  {
    id: 'f_002',
    type: 'release',
    actor: 'shadcn-ui/ui',
    title: 'v0.9.0',
    body: 'New components, breaking changes to Dialog & Sheet.',
    when: '1 day ago',
  },
  {
    id: 'f_003',
    type: 'star',
    actor: 'octodev',
    target: 'tiangolo/fastapi',
    targetDescription: 'FastAPI framework, high performance, easy to learn.',
    language: 'Python',
    languageColor: '#3572A5',
    stars: 81203,
    when: '3 days ago',
  },
];

export const MOCK_FILES = [
  { name: '.github', type: 'folder', lastCommit: 'ci: bump node to 20', when: '2 weeks ago' },
  { name: 'src', type: 'folder', lastCommit: 'feat: add Combobox component', when: '3 days ago' },
  { name: 'tests', type: 'folder', lastCommit: 'test: cover edge cases', when: '5 days ago' },
  { name: '.eslintrc.json', type: 'file', lastCommit: 'chore: stricter eslint rules', when: '2 weeks ago' },
  { name: '.gitignore', type: 'file', lastCommit: 'chore: ignore .env.local', when: '1 month ago' },
  { name: 'LICENSE', type: 'file', lastCommit: 'Initial commit', when: '8 months ago' },
  { name: 'README.md', type: 'file', lastCommit: 'docs: update install steps', when: '1 day ago' },
  { name: 'package.json', type: 'file', lastCommit: 'feat: add Combobox component', when: '3 days ago' },
  { name: 'tsconfig.json', type: 'file', lastCommit: 'chore: target ES2022', when: '4 months ago' },
];

export const MOCK_README = `# awesome-ui-kit

A modern, accessible React UI kit built with Tailwind and Radix.

## Features

- 30+ accessible components
- Tailwind CSS styling
- Dark mode support
- TypeScript first
- Zero runtime CSS

## Install

\`\`\`bash
npm install awesome-ui-kit
\`\`\`

## Usage

\`\`\`tsx
import { Button } from 'awesome-ui-kit'

export default function App() {
  return <Button>Hello</Button>
}
\`\`\`

## License

MIT
`;

export const MOCK_ISSUES = [
  {
    id: 'i_001',
    number: 142,
    title: 'Dialog: focus trap escapes on iOS Safari',
    state: 'open',
    author: 'janedoe',
    labels: [{ name: 'bug', color: '#d73a4a' }, { name: 'iOS', color: '#0075ca' }],
    comments: 4,
    when: 'opened 2 days ago',
  },
  {
    id: 'i_002',
    number: 141,
    title: 'Add Combobox component',
    state: 'open',
    author: 'octodev',
    labels: [{ name: 'enhancement', color: '#a2eeef' }],
    comments: 12,
    when: 'opened 1 week ago',
  },
  {
    id: 'i_003',
    number: 138,
    title: 'Tooltip cuts off near viewport edges',
    state: 'closed',
    author: 'maxr',
    labels: [{ name: 'bug', color: '#d73a4a' }],
    comments: 6,
    when: 'closed 3 days ago',
  },
  {
    id: 'i_004',
    number: 130,
    title: 'Improve TypeScript types for Select',
    state: 'closed',
    author: 'lisa',
    labels: [{ name: 'typescript', color: '#3178c6' }, { name: 'good first issue', color: '#7057ff' }],
    comments: 3,
    when: 'closed 2 weeks ago',
  },
];

export const MOCK_PULL_REQUESTS = [
  {
    id: 'p_001',
    number: 89,
    title: 'feat(combobox): initial implementation',
    state: 'open',
    author: 'octodev',
    branch: 'feat/combobox',
    labels: [{ name: 'enhancement', color: '#a2eeef' }],
    when: 'opened 4 days ago',
  },
  {
    id: 'p_002',
    number: 87,
    title: 'fix(dialog): focus trap on iOS',
    state: 'merged',
    author: 'janedoe',
    branch: 'fix/dialog-focus',
    labels: [{ name: 'bug', color: '#d73a4a' }],
    when: 'merged 1 day ago',
  },
];

export const MOCK_COMMITS = [
  { sha: 'a1b2c3d', message: 'feat: add Combobox component', author: 'octodev', when: '3 days ago' },
  { sha: 'e4f5g6h', message: 'docs: update install steps', author: 'octodev', when: '1 day ago' },
  { sha: 'i7j8k9l', message: 'fix: tooltip position near edges', author: 'maxr', when: '4 days ago' },
  { sha: 'm0n1o2p', message: 'test: cover edge cases', author: 'janedoe', when: '5 days ago' },
];

export const MOCK_CODE_SAMPLE = `import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border border-input bg-background hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
`;

export const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Markdown: '#083fa1',
  Java: '#b07219',
};
