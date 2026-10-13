export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const CATEGORIES: Category[] = [
  { id: 'education', name: 'Education', icon: 'GraduationCap', description: 'Learning, schools, and academic life' },
  { id: 'technology', name: 'Technology', icon: 'Cpu', description: 'Digital tools, AI, and innovation' },
  { id: 'work-career', name: 'Work & Career', icon: 'Briefcase', description: 'Jobs, workplace, and professional growth' },
  { id: 'lifestyle', name: 'Lifestyle', icon: 'Coffee', description: 'Daily life, habits, and routines' },
  { id: 'social-relationships', name: 'Social Relationships', icon: 'Users', description: 'Family, friends, and social connections' },
  { id: 'environment', name: 'Environment', icon: 'Leaf', description: 'Nature, climate, and sustainability' },
  { id: 'entertainment', name: 'Entertainment', icon: 'Film', description: 'Movies, music, and leisure activities' },
  { id: 'consumer-behavior', name: 'Consumer Behavior', icon: 'ShoppingBag', description: 'Shopping, brands, and spending habits' },
  { id: 'personal-growth', name: 'Personal Growth', icon: 'TrendingUp', description: 'Self-improvement and life goals' },
  { id: 'decision-making', name: 'Decision Making', icon: 'GitBranch', description: 'Choices, trade-offs, and priorities' },
  { id: 'values', name: 'Values', icon: 'Heart', description: 'Beliefs, principles, and what matters' },
  { id: 'change-innovation', name: 'Change & Innovation', icon: 'Lightbulb', description: 'Adaptation, progress, and new ideas' },
  { id: 'responsibility', name: 'Responsibility', icon: 'Shield', description: 'Duty, accountability, and commitment' },
];

export const QUESTION_TYPES = [
  { id: 'preference', name: 'Preference', shortName: 'Preference' },
  { id: 'agreement', name: 'Agreement', shortName: 'Agreement' },
  { id: 'advantages-disadvantages', name: 'Advantages & Disadvantages', shortName: 'Adv/Disadv' },
  { id: 'suggestion-solution', name: 'Suggestion & Solution', shortName: 'Solution' },
] as const;

export type QuestionTypeId = typeof QUESTION_TYPES[number]['id'];

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
export type Difficulty = typeof DIFFICULTIES[number];
