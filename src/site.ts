export const site = {
  name: "Vedant Thapar",
  url: "https://vedantthapar.com",
  tagline:
    "AI engineer building agent systems — and going deep on the systems underneath.",
  description:
    "Vedant Thapar is an AI engineer building agent systems, with a habit of going deep on the compilers, kernels and CPUs underneath. Open to full-time roles in 2026.",
  status: {
    role: "R&D intern @ 1Kosmos",
    doing: "building an agent control plane",
    location: "New Delhi · India / remote",
    availability: "open to full-time roles, 2026",
  },
  email: "contact@vedantthapar.com",
  github: "https://github.com/RazerBlade6",
  linkedin: "https://www.linkedin.com/in/vedant-thapar-52b962304/",
  resume: "/resume.pdf",
  repo: "https://github.com/RazerBlade6/vedantthapar.com",
} as const;

export const THEMES = [
  "gruvbox",
  "paper",
  "phosphor",
  "mocha",
  "latte",
] as const;
export type Theme = (typeof THEMES)[number];
