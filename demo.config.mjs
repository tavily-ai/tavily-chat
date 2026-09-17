export default {
  title: 'Tavily Chat',
  repository: 'https://github.com/tavily-ai/tavily-chat',
  model: 'mini',
  timeoutMs: 240000,
  maxMessageLength: 2000,
  maxHistory: 6,
  prompts: [
    {label: 'Catch up on AI', question: 'What are the most notable AI developments this week?', icon: '✳'},
    {label: 'Compare technologies', question: 'How do sodium-ion batteries compare with lithium-ion batteries?', icon: '⇄'},
    {label: 'Explore a breakthrough', question: 'What are the latest breakthroughs in fusion energy?', icon: '◌'},
    {label: 'Follow an industry', question: 'What is happening in the space industry this month?', icon: '↗'},
  ],
};
