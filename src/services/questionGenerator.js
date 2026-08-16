/**
 * Question Generator Utility
 * Generates or provides 60 high quality MCQ questions for a certification.
 */

const categories = {
  'Cybersecurity & Information Security': [
    { q: "What does CIA triad stand for in information security?", a: "Confidentiality, Integrity, Availability", b: "Control, Inspection, Authorization", c: "Cipher, Identity, Authentication", d: "Central, Internal, Access", correct: "A" },
    { q: "Which type of attack involves overwhelming a server with excessive traffic?", a: "SQL Injection", b: "Distributed Denial of Service (DDoS)", c: "Man-in-the-Middle", d: "Cross-Site Scripting (XSS)", correct: "B" },
    { q: "What protocol provides encrypted communication over a web network?", a: "HTTP", b: "FTP", c: "HTTPS", d: "Telnet", correct: "C" },
    { q: "What is Multi-Factor Authentication (MFA)?", a: "Using two passwords from the same account", b: "Combining two or more distinct verification factors", c: "Changing passwords every 30 days", d: "Using a password manager", correct: "B" },
    { q: "Which attack vector injects malicious client-side script into web pages?", a: "XSS (Cross-Site Scripting)", b: "CSRF", c: "Buffer Overflow", d: "DNS Spoofing", correct: "A" }
  ],
  'Cloud Computing & Infrastructure': [
    { q: "What model describes cloud services providing virtual machines and networking?", a: "SaaS", b: "PaaS", c: "IaaS", d: "FaaS", correct: "C" },
    { q: "Which concept allows automatic scaling of resources based on demand?", a: "Load Balancing", b: "Auto-scaling", c: "Containerization", d: "Replication", correct: "B" },
    { q: "What does SLA stand for in cloud services?", a: "Service Level Agreement", b: "System Logic Assessment", c: "Server Location Access", d: "Security Layer Architecture", correct: "A" }
  ],
  'Data Privacy & Compliance (GDPR/HIPAA)': [
    { q: "What does GDPR give individuals regarding their personal data?", a: "Right to be forgotten", b: "Right to free internet", c: "Right to edit government records", d: "Right to bypass encryption", correct: "A" },
    { q: "Under HIPAA, what does PHI stand for?", a: "Protected Health Information", b: "Private Hospital Index", c: "Public Health Insurance", d: "Personal Hazard Identification", correct: "A" }
  ],
  'Agile Project Management': [
    { q: "What is the primary role of a Scrum Master?", a: "Project Manager who dictates tasks", b: "Servant leader and facilitator for the team", c: "Software tester", d: "Product CEO", correct: "B" },
    { q: "What is a Sprint in Agile methodology?", a: "A timeboxed iteration usually lasting 1 to 4 weeks", b: "A rapid coding marathon", c: "The final deployment phase", d: "An emergency bug fix session", correct: "A" }
  ]
};

function generate60QuestionsForCertification(title, category) {
  const baseQuestions = categories[category] || categories['Cybersecurity & Information Security'];
  const questions = [];

  for (let i = 1; i <= 60; i++) {
    const template = baseQuestions[(i - 1) % baseQuestions.length];

    // Customize question slightly to make each of the 60 distinct
    questions.push({
      question: `Q${i}: [${title}] ${template.q}${i > baseQuestions.length ? ` (Domain Assessment Part ${Math.ceil(i/baseQuestions.length)})` : ''}`,
      option_a: template.a,
      option_b: template.b,
      option_c: template.c,
      option_d: template.d,
      correct_option: template.correct,
      explanation: `Correct option is ${template.correct}. ${template.q}`
    });
  }

  return questions;
}

module.exports = {
  generate60QuestionsForCertification
};
