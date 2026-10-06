export interface SupportFaq {
  question: string;
  answer: string;
}

export const SUPPORT_FAQS: SupportFaq[] = [
  {
    question: "Why is there an AI limit?",
    answer:
      "The AI features run on free-tier language models, and free tiers cap how many requests a service can send. Each visitor gets 40 AI requests per rolling 5 hours across the assistant, payload generator, test cases, TypeScript generation and AI-prompt generation. The cap keeps one person from using up the shared allowance for everyone else.",
  },
  {
    question: "Why can AI answers be wrong?",
    answer:
      "The models behind the free tier are smaller and slower under load than frontier models. They can miss edge cases in a schema, invent details that look right, or refuse a request. Read generated types, payloads and tests before you ship them, and run them against the real API.",
  },
  {
    question: "Will the limits go up?",
    answer:
      "Higher limits cost money, so they depend on funding. Support pays for access to more accurate models, higher limits and faster responses. There is no date or target for any of that, and the current limit stays until the cost of raising it is covered.",
  },
  {
    question: "Is my spec stored?",
    answer:
      "When you use an AI feature, the relevant part of your spec is sent to the model provider (Groq today) to produce the answer. The APIForge server keeps request metadata such as the feature used, the model, latency and errors. It does not write your spec text to a database. Do not paste specs you are not allowed to share with a third-party model.",
  },
  {
    question: "Can I self-host and use my own key?",
    answer:
      "Yes. APIForge is open source. Clone the repo, copy .env.local.example to .env.local, and set GROQ_API_KEY to your own Groq key. Your key sets your own limits, and the model can be changed with the optional GROQ_MODEL variable.",
  },
  {
    question: "How do I report a bad answer?",
    answer:
      "Open an issue on GitHub with the feature you used, the spec or a trimmed version of it, and what the model got wrong. A wrong answer caused by a missing rule is often fixable in the prompt or in the rule-based checks, which do not use the AI quota.",
  },
];
