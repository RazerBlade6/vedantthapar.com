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
  // Resume links are hidden until a phone-less PDF is added at public/resume.pdf;
  // then set this back to "/resume.pdf" (and drop it from .gitignore).
  resume: undefined as string | undefined,
  repo: "https://github.com/RazerBlade6/vedantthapar.com",
  // Shared by the About section and `cat about.txt`
  about: [
    "I'm a Computer Science graduate from BITS Pilani, Dubai (2026), now doing R&D at 1Kosmos in New Delhi, where I build the infrastructure their agents run on.",
    "Most of my work is AI engineering — agents, RAG, MCP tooling — but I keep getting pulled down the stack. I've written an interpreter in Rust, a pipelined RISC-V CPU in SystemVerilog, and I'm slowly writing a kernel in assembly. I think the best agent systems are built by people who understand what's underneath them.",
  ],
  contactNote:
    "I'm looking for full-time roles from 2026 — India or remote. The fastest way to reach me is email.",
} as const;

export const THEMES = [
  "gruvbox",
  "paper",
  "phosphor",
  "mocha",
  "latte",
] as const;
export type Theme = (typeof THEMES)[number];
