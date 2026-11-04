export type NavItem = {
  label: string;
  href: `#${string}`;
};

export const portfolioContent = {
  identity: {
    name: "Md Kasif Uddin",
    displayName: "KASIF",
    roles: ["AI Software Engineer", "Backend Architect", "Tech Content Creator"]
  },
  hero: {
    backgroundWord: "PORTFOLIO",
    eyebrow: ["AI ENGINEER / BACKEND ARCHITECT / TECH CREATOR", "VISUAL STORYTELLER"],
    availability: "AVAILABLE FOR COLLABORATION",
    greeting: "Hello, I'm",
    disciplines: ["AI SOFTWARE ENGINEER &", "BACKEND ARCHITECT"],
    introduction: "I turn ideas into interfaces people feel. From the first wireframe to the last pixel, shipped fast, built with AI.",
    workCta: "See my work",
    location: "INDIA",
    reelLabel: "PLAY REEL",
    reelMetadata: "AI · BACKEND",
    reelEmbedUrl: undefined,
    reelModalKicker: "KASIF / SHOWREEL",
    reelModalTitle: "A little more in motion",
    reelPlaceholderLabel: "SHOWREEL PREVIEW",
    reelPlaceholderInstruction: "The showreel link will appear here when available.",
    cutoutAlt: "Portrait of Md Kasif Uddin",
    cutoutPlaceholder: "ADD CUTOUT · /public/hero-cutout.webp",
    stats: [
      { value: "3+", label: "YEARS BUILDING" },
      { value: "∞", label: "PROJECTS SHIPPED" },
      { value: "20+", label: "BRAND COLLABS" }
    ],
    cvLabel: "DOWNLOAD CV",
    cvHref: "/cv.pdf",
    asideNote: "Every pixel, a different feeling.",
    scrollLabel: "SCROLL TO DISCOVER +",
    footerLabel: "SELECTED WORK · 2025–2026",
    cutoutPath: "/hero-cutout.webp",
    cutoutMobilePath: "/hero-cutout-mobile.webp"
  },
  navigation: [
    { label: "Work", href: "#work" },
    { label: "Recognition", href: "#recognition" },
    { label: "About", href: "#about" },
    { label: "Journey", href: "#journey" },
    { label: "Contact", href: "#contact" }
  ] satisfies NavItem[],
  navigationCta: { label: "Let's talk", href: "#contact" },
  footer: {
    note: undefined,
    projectPrompt: "Tell your project",
    socialLinks: [
      { label: "X", href: "https://x.com/md_kasif_uddin", icon: "x" },
      { label: "GitHub", href: "https://github.com/MdKasif0", icon: "github" },
      { label: "Email", href: "mailto:mdkasifuddin123@gmail.com", icon: "email" }
    ]
  },
  work: {
    eyebrowNumber: "01",
    eyebrowLabel: "SELECTED WORK",
    title: "WORK THAT SPEAKS",
    allWork: "ALL WORK",
    noResults: "No projects match that search. Try another title or category.",
    filters: ["All", "AI & ML", "Web Apps", "3D & Games", "macOS"],
    searchPlaceholder: "Search: title or category…",
    viewAll: "VIEW ALL",
    openProject: "Open project",
    projects: [
      {
        title: "GitRoasted",
        tag: "AI TOOL",
        subtitle: "Scores any GitHub profile out of 1,000, then lets an AI roast it.",
        categories: ["AI & ML", "Web Apps"],
        year: "2025",
        href: "https://gitroasted.netlify.app",
        githubHref: "https://github.com/MdKasif0/GitRoasted",
        liveHref: "https://gitroasted.netlify.app",
        overview: "A free, open-source tool that reads real git activity, scores a developer's GitHub profile out of 1,000 and delivers an unfiltered AI roast, with shareable result cards and an installable PWA.",
        role: "Product design · Full-stack development",
        stack: ["Next.js", "TypeScript", "Genkit · Gemini", "Firebase", "PWA"],
        art: "gitroasted",
        cover: "gitroasted"
      },
      {
        title: "Cookie",
        tag: "MACOS COMPANION",
        subtitle: "A quiet, warm desktop cat that lives on your Mac.",
        categories: ["macOS"],
        year: "2026",
        href: "https://cookie-v1.netlify.app/",
        githubHref: "https://github.com/MdKasif0/Cookie",
        liveHref: "https://cookie-v1.netlify.app/",
        overview: "A lightweight, fully offline macOS companion that roams your windows and Dock with real physics, adapts to what you're working on, and never sends a byte of data anywhere.",
        role: "Native macOS app · Design & engineering",
        stack: ["Swift", "SwiftUI", "SpriteKit", "Sparkle"],
        art: "cookie",
        cover: "cookie"
      },
      {
        title: "Shadow of the Crimson Gate",
        tag: "3D ACTION GAME",
        subtitle: "A cinematic Japanese dark-fantasy action game, built for the browser.",
        categories: ["3D & Games", "Web Apps"],
        year: "2026",
        href: "https://shadow-of-the-crimson-gate.netlify.app/",
        githubHref: "https://github.com/MdKasif0/Shadow-of-the-Crimson-Gate",
        liveHref: "https://shadow-of-the-crimson-gate.netlify.app/",
        overview: "Real-time katana combat with dashes and combos, multi-phase yokai boss fights, moonlit atmospheric lighting and synthesized audio, all running in the browser on a custom Three.js engine with saved progress.",
        role: "Game design · Engine & graphics programming",
        stack: ["Three.js", "TypeScript", "WebGL", "Web Audio API"],
        art: "crimson",
        cover: "shadow-of-the-crimson-gate"
      },
      {
        title: "Kerr Black Hole",
        tag: "3D SIMULATION",
        subtitle: "A procedural, Interstellar-inspired rotating black hole in Blender.",
        categories: ["3D & Games"],
        year: "2026",
        href: "https://github.com/MdKasif0/black-hole-blender",
        githubHref: "https://github.com/MdKasif0/black-hole-blender",
        liveHref: undefined,
        overview: "A scientifically inspired, fully procedural Kerr black hole: a lensed Einstein ring, a Keplerian accretion disk with a white-hot to crimson thermal gradient, and 250,000+ plasma particles, generated from Python and rendered in Cycles.",
        role: "3D simulation · Technical art",
        stack: ["Blender", "Python", "Geometry Nodes", "Cycles"],
        art: "blackhole",
        cover: "kerr-black-hole"
      },
      {
        title: "AI Checkers Arena",
        tag: "AI ARENA",
        subtitle: "Watch large language models battle live in International Checkers.",
        categories: ["AI & ML", "Web Apps"],
        year: "2026",
        href: "https://github.com/MdKasif0/AI-Checkers-Arena",
        githubHref: "https://github.com/MdKasif0/AI-Checkers-Arena",
        liveHref: undefined,
        overview: "A live spectator arena where AI models play full games of International Checkers, with human-vs-AI matches, a model leaderboard tracking win rate, illegal moves and latency, and Google sign-in.",
        role: "Product design · Full-stack development",
        stack: ["Next.js", "TypeScript", "OpenRouter", "Supabase", "Framer Motion"],
        art: "checkers",
        cover: "ai-checkers-arena"
      },
      {
        title: "Object Detection Suite",
        tag: "COMPUTER VISION",
        subtitle: "Production-ready YOLOv8 engines for images, video and live webcam.",
        categories: ["AI & ML"],
        year: "2026",
        href: "https://github.com/MdKasif0/Object-Detection",
        githubHref: "https://github.com/MdKasif0/Object-Detection",
        liveHref: undefined,
        overview: "Five ready-to-run YOLOv8 engines: an analytics dashboard with interactive charts, YouTube and webcam tracking, multi-threaded FP16 batch processing, and beginner-friendly scripts, each with a Google Colab notebook and auto-installed dependencies.",
        role: "Machine learning · Tooling",
        stack: ["Python", "YOLOv8", "OpenCV", "Supervision", "Plotly"],
        art: "vision",
        cover: "object-detection-suite"
      }
    ],
    githubProfile: "https://github.com/MdKasif0"
  },
  collaborators: {
    label: "BEEN PART OF /",
    title: "THE BIGGER PICTURE.",
    count: 20,
    countSuffix: "+",
    countLabel: "brand collaborations",
    names: ["Blackbox AI", "Kimi", "SuperApp", "yapper.so", "Glass Editor", "startblock.shop"]
  },
  recognition: {
    eyebrow: "RECOGNITION & COLLABS",
    titleWhite: "THE WORK",
    titleRed: "THE RECOGNITION",
    count: 22,
    countSuffix: "+",
    countLabel: "HACKATHONS & COLLABS",
    breakdown: [
      { value: "2", label: "HACKATHONS" },
      { value: "20+", label: "BRAND COLLABS" }
    ],
    summary: "Hackathon podiums and brand collaborations, built in public.",
    listLabel: "SELECTED RECOGNITION",
    entries: [
      { title: "GigSense", result: "1ST RUNNER-UP", type: "SOLO HACKATHON", year: "2026", event: "InnoSprint 2.0 · D4 Community × Google for Developers · Chandigarh University", description: "A financial intelligence and evidence ledger for gig couriers.", href: "/certificates/innosprint-2-0.pdf", linkLabel: "VIEW CERTIFICATE", projectHref: "https://gigsense-v1.netlify.app/", projectLabel: "VIEW PROJECT", showPartners: false },
      { title: "TrustLayer", result: undefined, type: "HACKATHON", year: "2026", event: "Hackverse · Terrabyte Society, Chandigarh University", description: "Multi-layer media verification.", href: "https://trustlayer-v1.netlify.app/", linkLabel: "VIEW PROJECT", projectHref: undefined, projectLabel: undefined, showPartners: false },
      { title: "Brand collaborations", result: undefined, type: "COLLAB", year: "2026", event: undefined, description: "20+ creative collaborations with AI and tech brands.", href: undefined, linkLabel: undefined, projectHref: undefined, projectLabel: undefined, showPartners: true }
    ]
  },
  rawToReal: {
    eyebrow: "A LOOK UNDER THE SURFACE",
    titleBefore: "FROM WIREFRAME",
    titleAfter: "TO REAL",
    caption: "One screen. Many layers. See how a rough layout becomes a living product.",
    beforeLabel: "WIREFRAME",
    afterLabel: "FINAL UI",
    project: "GitRoasted",
    year: "2025",
    url: "gitroasted.netlify.app",
    liveLabel: "VISIT LIVE",
    finalImage: "/raw-real/gitroasted-final.webp",
    finalImageMobile: "/raw-real/gitroasted-final-mobile.webp",
    wireImage: "/raw-real/gitroasted-wire.svg",
    wireImageMobile: "/raw-real/gitroasted-wire-mobile.svg",
    finalAlt: "The live GitRoasted landing page",
    wireAlt: "A wireframe of the same GitRoasted page, drawn from its real layout",
    sliderLabel: "Reveal final interface"
  },
  about: {
    eyebrow: "02 / BEHIND THE SCREEN",
    titleBefore: "NOT JUST CODE",
    titleAfter: "A WAY OF TELLING STORIES",
    bioLines: [
      "A developer in delusion: convinced every idea can ship, then shipping it.",
      "Freelance software engineer building AI-powered products, full-stack web apps and native macOS tools, from the first sketch to production.",
      "Building in public as a tech creator on X, @md_kasif_uddin."
    ],
    educationLabel: "EDUCATION",
    educationDegree: "B.Tech CSE",
    educationSchool: "Chandigarh University, Mohali",
    educationStatus: "CURRENTLY STUDYING",
    educationYear: "1ST YEAR · 2026 — NOW",
    toolkitLabel: "CREATIVE TOOLKIT",
    toolkitGroups: [
      { label: "Languages", skills: ["TypeScript", "JavaScript", "Python", "Swift"] },
      { label: "Frontend", skills: ["React", "Next.js", "Tailwind CSS", "Three.js"] },
      { label: "Backend & Data", skills: ["Node.js", "Supabase", "Firebase", "PostgreSQL"] },
      { label: "AI & ML", skills: ["OpenAI", "Gemini", "Hugging Face", "TensorFlow"] },
      { label: "Tools", skills: ["Git", "Figma", "Docker", "n8n", "Netlify"] }
    ],
    processLabel: "FROM IDEA TO FINAL SHIP",
    process: [
      { title: "THE IDEA", description: "Start with a need, question or rough sketch worth exploring." },
      { title: "THE PLAN", description: "Map the structure, key states and path through the product." },
      { title: "THE CRAFT", description: "Turn the plan into a considered interface and working code." },
      { title: "THE POLISH", description: "Refine the details, interactions and responsive behavior." },
      { title: "THE LAUNCH", description: "Check the final experience and prepare it to ship." }
    ],
    quote: "From concept to code, to a product that feels alive.",
    signature: "Kasif",
    quoteFooter: "LET'S MAKE THE NEXT BUILD COUNT"
  },
  journey: {
    eyebrow: "03 / THE JOURNEY",
    title: "KEEP MOVING. KEEP BUILDING",
    nowLabel: "NOW",
    activeRole: "Freelance AI Software Engineer & Backend Architect",
    activePeriod: "2025 — NOW",
    activeSubtitle: "Freelance · AI software & backend systems",
    activePoints: [
      "Designing and building AI-powered software from first idea to production.",
      "Pairing applied AI with solid backend architecture.",
      "Turning rough concepts into products that feel alive."
    ],
    roles: [
      { title: "Tech Content Creator on X", period: "2026", subtitle: "@md_kasif_uddin · AI, dev tools and building in public" },
      { title: "Brand collaborations", period: "2026", subtitle: "20+ collaborations with AI and tech brands" },
      { title: "B.Tech CSE student", period: "2026", subtitle: "Chandigarh University, Mohali · First year" }
    ],
    milestonesLabel: "A FEW MILESTONES",
    milestonesTitleWhite: "LITTLE WINS",
    milestonesTitleRed: "BIG MEANING",
    milestones: [
      { title: "Launched GitRoasted", year: "2025", href: "https://gitroasted.netlify.app/" },
      { title: "Shipped GigSense", year: "2026", href: "https://gigsense-v1.netlify.app/" },
      { title: "20+ brand collaborations", year: "2026", href: "#recognition" },
      { title: "1st Runner-Up, InnoSprint 2.0", year: "2026", href: "/certificates/innosprint-2-0.pdf" }
    ]
  },
  contact: {
    eyebrow: "04 / YOUR NEXT STORY",
    title: "LET'S WORK TOGETHER",
    introduction: "Got a product idea? Let's build something worth shipping.",
    formTitle: "START A PROJECT",
    formSubtitle: "Tell me what you're building.",
    budgets: ["Under $1k", "$1k — $3k", "$3k+"],
    formSubmit: "SEND PROJECT",
    formSending: "SENDING…",
    formSentTitle: "MESSAGE SENT",
    formSentBody: "Thanks. I'll reply by email.",
    formSendAnother: "SEND ANOTHER",
    formError: "That didn't send. Please email me instead:",
    cta: "START THE CONVERSATION",
    email: "mdkasifuddin123@gmail.com",
    emailLabel: "EMAIL",
    socials: [
      { label: "X", value: "@md_kasif_uddin", href: "https://x.com/md_kasif_uddin", icon: "x" },
      { label: "GITHUB", value: "MdKasif0", href: "https://github.com/MdKasif0", icon: "github" }
    ],
    locationLabel: "BASED IN",
    location: "India",
    cardKicker: "KASIF / VISUAL STORIES",
    cardTitleWhite: "MAKE IT",
    cardTitleRed: "FEEL REAL",
    modalLabel: "OPEN SHOWREEL",
    reelModalKicker: "KASIF / SHOWREEL",
    reelModalTitle: "A little more in motion",
    reelPlaceholderLabel: "SHOWREEL PREVIEW",
    reelPlaceholderInstruction: "The showreel link will appear here when available."
  },
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "https://kasif-portfolio.netlify.app",
  sections: []
} as const;
