export interface NavItem {
  to: string;
  label: string;
  /** One line under the label in the header menus. */
  description: string;
}
export interface NavGroupItem {
  label: string;
  items: NavItem[];
}

/** Pages linked directly from the header. */
export const TOP_LINKS: NavItem[] = [
  { to: '/models', label: 'Models', description: 'Compare every AI model we track' },
  {
    to: '/coding-agents',
    label: 'Coding agents',
    description: 'Agents and models on coding tests',
  },
];

/** Grouped pages. New analysis or learning pages go in these lists. */
export const NAV_GROUPS: NavGroupItem[] = [
  {
    label: 'Analysis',
    items: [
      {
        to: '/leaderboard',
        label: 'Model rankings',
        description: 'Scores on every published test',
      },
      { to: '/leaders', label: 'Current leaders', description: 'The best model on each measure' },
      {
        to: '/trends',
        label: 'AI trends',
        description: 'How capability, cost and scale are changing',
      },
      {
        to: '/score-price-time',
        label: 'Score, price and time',
        description: 'Capability against price and release date',
      },
      {
        to: '/market',
        label: 'Market overview',
        description: 'Makers, hosts, prices and open weights',
      },
      { to: '/releases', label: 'Model releases', description: 'Every new model, newest first' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { to: '/news', label: 'Insights and guides', description: 'Articles on reading AI results' },
      { to: '/learn', label: 'Learn AI', description: 'A free course with Python projects' },
      {
        to: '/tools',
        label: 'Free file tools',
        description: 'Image, PDF and Word tools in your browser',
      },
    ],
  },
];
