import {
  Activity,
  BookOpen,
  Building,
  Calculator,
  CalendarDays,
  ChartColumn,
  ChartPie,
  ChartScatter,
  Cpu,
  Film,
  GitCompareArrows,
  GraduationCap,
  Image,
  ListOrdered,
  Medal,
  Newspaper,
  SquareTerminal,
  Target,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  /** One line under the label in the header menus. */
  description: string;
  /** Shown beside the label in the menus, in place of a number. */
  icon: LucideIcon;
}
/** Pages that belong together, side by side in a header menu. */
export interface NavSection {
  /** Left out when a menu has one section. */
  label?: string;
  items: NavItem[];
}
export interface NavGroupItem {
  label: string;
  sections: NavSection[];
}

/** Every page in a header menu, in order. */
export const navItems = (group: NavGroupItem) => group.sections.flatMap((section) => section.items);

/** Pages linked directly from the header. */
export const TOP_LINKS: NavItem[] = [
  { to: '/models', label: 'Models', description: 'Compare every AI model we track', icon: Cpu },
  {
    to: '/coding-agents',
    label: 'Coding agents',
    description: 'Agents and models on coding tests',
    icon: SquareTerminal,
  },
];

/** The comparison page, a button in the header and a link in the phone menu. */
export const COMPARE_LINK: NavItem = {
  to: '/compare',
  label: 'Compare models',
  description: 'Two or three models side by side, with a link to share',
  icon: GitCompareArrows,
};

/** Grouped pages. New analysis or learning pages go in these lists. */
export const NAV_GROUPS: NavGroupItem[] = [
  {
    label: 'Analysis',
    sections: [
      {
        label: 'Rankings',
        items: [
          {
            to: '/leaderboard',
            label: 'Model rankings',
            description: 'Scores on every published test',
            icon: ChartColumn,
          },
          {
            to: '/tests',
            label: 'Every test',
            description: 'What each test measures, and who leads it',
            icon: ListOrdered,
          },
          {
            to: '/leaders',
            label: 'Current leaders',
            description: 'The best model on each measure',
            icon: Medal,
          },
          {
            to: '/score-price-time',
            label: 'Score, price and time',
            description: 'Capability against price and release date',
            icon: ChartScatter,
          },
        ],
      },
      {
        label: 'Market',
        items: [
          {
            to: '/market',
            label: 'Market overview',
            description: 'Makers, hosts, prices and open weights',
            icon: ChartPie,
          },
          {
            to: '/makers',
            label: 'Model makers',
            description: 'Each maker’s models, results and prices',
            icon: Building,
          },
          {
            to: '/releases',
            label: 'Model releases',
            description: 'Every new model, newest first',
            icon: CalendarDays,
          },
          {
            to: '/changes',
            label: 'What changed',
            description: 'Price changes, new leaders and releases',
            icon: Activity,
          },
        ],
      },
      {
        label: 'Trends and media',
        items: [
          {
            to: '/weekly',
            label: 'This week',
            description: 'The week in AI models, on one page',
            icon: Newspaper,
          },
          {
            to: '/trends',
            label: 'AI trends',
            description: 'How capability, cost and scale are changing',
            icon: TrendingUp,
          },
          {
            to: '/image-models',
            label: 'Image models',
            description: 'Text to image and image editing, ranked by votes',
            icon: Image,
          },
          {
            to: '/video-models',
            label: 'Video models',
            description: 'Text and image to video, ranked by votes',
            icon: Film,
          },
        ],
      },
    ],
  },
  {
    label: 'Resources',
    sections: [
      {
        label: 'Choose a model',
        items: [
          {
            to: '/model-finder',
            label: 'Model finder',
            description: 'The best model for your task and budget',
            icon: Target,
          },
          {
            to: '/cost-calculator',
            label: 'Cost calculator',
            description: 'What your workload costs on each model',
            icon: Calculator,
          },
        ],
      },
      {
        label: 'Learn and tools',
        items: [
          {
            to: '/news',
            label: 'Insights and guides',
            description: 'Articles on reading AI results',
            icon: BookOpen,
          },
          {
            to: '/learn',
            label: 'Learn AI',
            description: 'A free course with Python projects',
            icon: GraduationCap,
          },
          {
            to: '/tools',
            label: 'Free file tools',
            description: 'Image, PDF and Word tools in your browser',
            icon: Wrench,
          },
        ],
      },
    ],
  },
];
