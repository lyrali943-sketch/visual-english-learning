export interface Reason {
  id: string;
  name: string;
  chineseName: string;
  description: string;
  keyPhrases: string[];
  sentencePatterns: string[];
  applicableScenarios: string[];
  example: string;
}

export const REASONS: Reason[] = [
  {
    id: 'time-efficiency',
    name: 'Time Efficiency',
    chineseName: '时间效率',
    description: 'Saving time and improving efficiency in daily life',
    keyPhrases: ['save time', 'time-efficient', 'more productive', 'make the most of time', 'time management'],
    sentencePatterns: [
      'One major advantage is that it saves a significant amount of time.',
      'This approach is much more time-efficient compared to traditional methods.',
      'It allows people to make the most of their limited time.',
    ],
    applicableScenarios: ['Technology adoption', 'Online learning', 'Fast food', 'Public transportation', 'Automation'],
    example: 'Online courses are time-efficient because you can learn at your own pace without commuting.',
  },
  {
    id: 'cost-effectiveness',
    name: 'Cost Effectiveness',
    chineseName: '成本效益',
    description: 'Reducing costs and saving money',
    keyPhrases: ['save money', 'cost-effective', 'affordable', 'financial burden', 'economic'],
    sentencePatterns: [
      'It is a cost-effective solution that reduces financial pressure.',
      'This option is much more affordable for most people.',
      'It helps cut down on unnecessary expenses.',
    ],
    applicableScenarios: ['Second-hand shopping', 'Public transportation', 'Cooking at home', 'Free online resources', 'Bulk buying'],
    example: 'Taking public transportation is cost-effective because it eliminates parking fees and fuel costs.',
  },
  {
    id: 'convenience',
    name: 'Convenience',
    chineseName: '便利性',
    description: 'Making life easier and more accessible',
    keyPhrases: ['convenient', 'easily accessible', 'at your fingertips', 'hassle-free', 'on the go'],
    sentencePatterns: [
      'The convenience of this option cannot be overstated.',
      'It makes everyday tasks much more convenient and hassle-free.',
      'People can access it anytime and anywhere.',
    ],
    applicableScenarios: ['Mobile apps', 'Online shopping', 'Food delivery', 'Digital payments', 'Remote work'],
    example: 'Mobile payment apps offer unparalleled convenience — you can pay for anything with just a tap.',
  },
  {
    id: 'learning-growth',
    name: 'Learning & Growth',
    chineseName: '学习与成长',
    description: 'Opportunities for learning and personal development',
    keyPhrases: ['learn new skills', 'personal growth', 'expand knowledge', 'self-improvement', 'broaden horizons'],
    sentencePatterns: [
      'It provides excellent opportunities for learning and personal growth.',
      'This experience helps people develop new skills and broaden their horizons.',
      'It is a valuable chance for self-improvement.',
    ],
    applicableScenarios: ['Studying abroad', 'Reading books', 'Taking courses', 'Learning instruments', 'Traveling'],
    example: 'Studying abroad offers tremendous learning and growth opportunities beyond academics.',
  },
  {
    id: 'health-well-being',
    name: 'Health & Well-being',
    chineseName: '健康与幸福',
    description: 'Physical and mental health benefits',
    keyPhrases: ['physical health', 'mental well-being', 'reduce stress', 'stay healthy', 'work-life balance'],
    sentencePatterns: [
      'It has significant benefits for both physical and mental health.',
      'This habit contributes to overall well-being and reduces stress.',
      'It helps people maintain a healthy work-life balance.',
    ],
    applicableScenarios: ['Exercise', 'Healthy eating', 'Meditation', 'Outdoor activities', 'Adequate sleep'],
    example: 'Regular exercise is essential for maintaining both physical health and mental well-being.',
  },
  {
    id: 'social-connection',
    name: 'Social Connection',
    chineseName: '社交与关系',
    description: 'Building and maintaining relationships',
    keyPhrases: ['build relationships', 'social bonds', 'connect with others', 'strengthen ties', 'community'],
    sentencePatterns: [
      'It helps people build meaningful social connections.',
      'This activity strengthens relationships and fosters a sense of community.',
      'It provides a great opportunity to connect with like-minded people.',
    ],
    applicableScenarios: ['Team sports', 'Social media', 'Volunteering', 'Community events', 'Family gatherings'],
    example: 'Joining a local club is a great way to build social connections with people who share similar interests.',
  },
  {
    id: 'flexibility',
    name: 'Flexibility',
    chineseName: '灵活性',
    description: 'Adaptability and freedom to choose',
    keyPhrases: ['flexible schedule', 'freedom to choose', 'adaptable', 'work-life balance', 'customize'],
    sentencePatterns: [
      'It offers great flexibility in terms of scheduling and customization.',
      'This approach is highly adaptable to different needs and situations.',
      'It gives people the freedom to choose what works best for them.',
    ],
    applicableScenarios: ['Remote work', 'Online learning', 'Freelancing', 'Flexible hours', 'Self-paced courses'],
    example: 'Remote work provides unmatched flexibility — you can design your own schedule and workspace.',
  },
  {
    id: 'quality-depth',
    name: 'Quality & Depth',
    chineseName: '质量与深度',
    description: 'Higher quality and deeper engagement',
    keyPhrases: ['high quality', 'in-depth', 'thorough', 'meaningful', 'depth over breadth'],
    sentencePatterns: [
      'It ensures higher quality and more in-depth understanding.',
      'This approach prioritizes depth over breadth.',
      'It leads to more meaningful and thorough results.',
    ],
    applicableScenarios: ['Small class sizes', 'Handmade products', 'Long-form content', 'Specialized skills', 'Deep reading'],
    example: 'Small class sizes ensure quality education because teachers can give individual attention to each student.',
  },
  {
    id: 'safety-stability',
    name: 'Safety & Stability',
    chineseName: '安全与稳定',
    description: 'Security, reliability, and peace of mind',
    keyPhrases: ['safe and secure', 'stable', 'reliable', 'peace of mind', 'risk-free'],
    sentencePatterns: [
      'It provides a safe and stable environment for everyone involved.',
      'This option is more reliable and offers greater peace of mind.',
      'It minimizes risks and ensures long-term stability.',
    ],
    applicableScenarios: ['Traditional careers', 'Established companies', 'Insurance', 'Savings accounts', 'Public institutions'],
    example: 'Working for an established company offers safety and stability that startups may not provide.',
  },
  {
    id: 'innovation-diversity',
    name: 'Innovation & Diversity',
    chineseName: '创新与多样性',
    description: 'New ideas, creativity, and diverse perspectives',
    keyPhrases: ['innovative', 'diverse', 'creative', 'fresh perspectives', 'think outside the box'],
    sentencePatterns: [
      'It encourages innovation and creative thinking.',
      'This environment fosters diversity and fresh perspectives.',
      'It pushes people to think outside the box.',
    ],
    applicableScenarios: ['Startups', 'Artistic pursuits', 'Cross-cultural experiences', 'Research', 'Design thinking'],
    example: 'Working in a startup encourages innovation because employees are constantly challenged to find creative solutions.',
  },
  {
    id: 'responsibility-contribution',
    name: 'Responsibility & Contribution',
    chineseName: '责任与贡献',
    description: 'Being accountable and making a positive impact',
    keyPhrases: ['sense of responsibility', 'contribute to society', 'make a difference', 'give back', 'accountable'],
    sentencePatterns: [
      'It instills a strong sense of responsibility and accountability.',
      'This experience allows people to contribute meaningfully to society.',
      'It is an opportunity to make a positive difference in the community.',
    ],
    applicableScenarios: ['Volunteering', 'Environmental protection', 'Mentoring', 'Community service', 'Ethical consumption'],
    example: 'Volunteering at a local shelter teaches responsibility while allowing you to contribute to the community.',
  },
  {
    id: 'interest-motivation',
    name: 'Interest & Motivation',
    chineseName: '兴趣与动力',
    description: 'Personal passion and intrinsic motivation',
    keyPhrases: ['passionate about', 'intrinsically motivated', 'genuine interest', 'enjoyment', 'self-driven'],
    sentencePatterns: [
      'When people are genuinely interested in something, they are more motivated to excel.',
      'This aligns with personal passions and intrinsic motivation.',
      'It is driven by genuine enjoyment rather than external pressure.',
    ],
    applicableScenarios: ['Hobbies', 'Career choices', 'Extracurricular activities', 'Creative pursuits', 'Personal projects'],
    example: 'Choosing a career aligned with your interests leads to greater motivation and job satisfaction.',
  },
];
