export type NavItem = {
  label: string;
  href: `#${string}`;
};

export const portfolioContent = {
  identity: {
    name: "Md Kasif Uddin",
    displayName: "KASIF",
    roles: ["Freelance Frontend Developer", "UI/UX Designer", "Tech Content Creator"]
  },
  hero: {
    backgroundWord: "PORTFOLIO",
    eyebrow: ["FRONTEND DEV / UI-UX / TECH CREATOR", "VISUAL STORYTELLER"],
    availability: "AVAILABLE FOR COLLABORATION",
    greeting: "Hello, I'm",
    disciplines: ["FRONTEND DEV &", "UI/UX DESIGNER"],
    introduction: "I turn ideas into interfaces people feel. From the first wireframe to the last pixel, shipped fast, built with AI.",
    workCta: "See my work",
    location: "INDIA",
    reelLabel: "PLAY REEL",
    reelMetadata: "UI / UX · WEB",
    reelEmbedUrl: undefined,
    reelModalKicker: "KASIF / SHOWREEL",
    reelModalTitle: "A little more in motion",
    reelPlaceholderLabel: "SHOWREEL PREVIEW",
    reelPlaceholderInstruction: "The showreel link will appear here when available.",
    cutoutAlt: "Portrait of Md Kasif Uddin",
    cutoutPlaceholder: "ADD CUTOUT · /public/hero-cutout.webp",
    stats: [
      { value: undefined, label: "YEARS BUILDING" },
      { value: undefined, label: "PROJECTS SHIPPED" },
      { value: "6", label: "BRAND COLLABS" }
    ],
    cvLabel: "DOWNLOAD CV",
    cvHref: undefined,
    asideNote: "Every pixel, a different feeling.",
    scrollLabel: "SCROLL TO DISCOVER +",
    footerLabel: "SELECTED WORK · 2024–2026",
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
      { label: "Instagram", href: "https://instagram.com/M_Kasif_Uddin", icon: "instagram" },
      { label: "GitHub", href: "https://github.com/MdKasif0", icon: "github" },
      { label: "Email", href: "", icon: "email" }
    ]
  },
  work: {
    eyebrowNumber: "01",
    eyebrowLabel: "SELECTED WORK",
    title: "WORK THAT SPEAKS",
    allWork: "ALL WORK",
    noResults: "No projects match that search. Try another title or category.",
    filters: ["All", "Web Apps", "AI Tools", "SaaS", "UI/UX", "Content", "Websites"],
    searchPlaceholder: "Search: title or category…",
    viewAll: "VIEW ALL",
    pageSize: 3,
    openProject: "Open project",
    placeholderThumbnail: "PROJECT PREVIEW",
    projects: [
      { title: "GitRoasted", tag: "AI TOOL", subtitle: "AI GitHub-profile roasting tool", categories: ["AI Tools", "Web Apps"], year: undefined, href: undefined, art: "gitroasted" },
      { title: "ReviewPilot", tag: "AI SAAS", subtitle: "AI-powered pull-request code-review SaaS", categories: ["AI Tools", "SaaS"], year: undefined, href: undefined, art: "reviewpilot" },
      { title: "GreenBoard", tag: "SAAS", subtitle: "Tutor-marketplace SaaS", categories: ["SaaS", "Web Apps"], year: undefined, href: undefined, art: "greenboard" },
      { title: "Gravites Network", tag: "CREATOR PLATFORM", subtitle: "Creator-led marketing platform on X", categories: ["Content", "Websites"], year: undefined, href: undefined, art: "gravites" },
      { title: "AI Checkers Arena", tag: "AI TOOL", subtitle: "Spectator platform where LLMs play International Checkers", categories: ["AI Tools", "Web Apps"], year: undefined, href: undefined, art: "checkers" },
      { title: "Cookie", tag: undefined, subtitle: undefined, categories: [], year: undefined, href: undefined, art: "cookie" },
      { title: "ShiftKit", tag: undefined, subtitle: undefined, categories: [], year: undefined, href: undefined, art: "shiftkit" }
    ],
    githubProfile: "https://github.com/MdKasif0"
  },
  collaborators: {
    label: "BEEN PART OF /",
    title: "THE BIGGER PICTURE.",
    names: ["Blackbox AI", "Kimi", "SuperApp", "yapper.so", "Glass Editor", "startblock.shop"]
  },
  recognition: {
    eyebrow: "RECOGNITION & COLLABS",
    titleWhite: "THE WORK",
    titleRed: "THE RECOGNITION",
    count: undefined,
    countLabel: "PROJECTS & COLLABS",
    summary: "Selected hackathon participation and creative brand collaborations.",
    proofLabel: "VIEW PROOF",
    proofHref: undefined,
    listLabel: "SELECTED RECOGNITION",
    yearColumn: "YEAR",
    entries: [
      { title: "TrustLayer", subtitle: "Hackverse · Terrabyte Society · Chandigarh University", year: undefined },
      { title: "ResQVision", subtitle: "D4 Community One-Day Solo Vibe Coding Hackathon", year: undefined },
      { title: "Brand collaborations", subtitle: "6 brand collaborations", year: undefined }
    ]
  },
  rawToReal: {
    eyebrow: "A LOOK UNDER THE SURFACE",
    titleBefore: "FROM WIREFRAME",
    titleAfter: "TO REAL",
    caption: "One screen. Many layers. See how a rough layout becomes a living product.",
    beforeLabel: "WIREFRAME",
    afterLabel: "FINAL UI",
    meta: "PROJECT NAME / YEAR · UI/UX · FRONTEND · SHIPPED",
    project: undefined,
    year: undefined,
    beforePlaceholder: "WIREFRAME PREVIEW",
    afterPlaceholder: "FINAL UI PREVIEW",
    sliderLabel: "Reveal final interface"
  },
  about: {
    eyebrow: "02 / BEHIND THE SCREEN",
    titleBefore: "NOT JUST CODE",
    titleAfter: "A WAY OF TELLING STORIES",
    bioLines: [
      "Freelance frontend developer, UI/UX designer and tech content creator on X @md_kasif_uddin.",
      "Building client work, brand collaborations and independent AI products.",
      "Bringing ideas to life through thoughtful interfaces and code."
    ],
    educationLabel: "EDUCATION & SKILLS",
    education: "B.Tech CSE — Chandigarh University, Mohali",
    educationYear: undefined,
    toolkitLabel: "CREATIVE TOOLKIT",
    skills: [
      "JavaScript", "TypeScript", "Python", "React", "Next.js", "Node.js", "OpenAI",
      "TensorFlow", "Hugging Face", "Firebase", "MongoDB", "PostgreSQL", "Cursor", "n8n",
      "Git", "Docker", "Netlify"
    ],
    toolIcons: [
      { short: "JS", name: "JavaScript" },
      { short: "TS", name: "TypeScript" },
      { short: "RE", name: "React" },
      { short: "NX", name: "Next.js" },
      { short: "PY", name: "Python" },
      { short: "AI", name: "OpenAI" },
      { short: "FG", name: "Figma" },
      { short: "GT", name: "Git" }
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
    activeRole: "Freelance Frontend Dev & UI/UX Designer",
    activePeriod: "CURRENT",
    activeSubtitle: "Freelance · Frontend development & product design",
    activeDescription: "Designing and building interfaces from first idea to final detail.\nCombining frontend craft with a thoughtful user experience.\nTurning rough concepts into products that feel alive.",
    roles: [
      { title: "Tech Content Creator on X", period: undefined, subtitle: "@md_kasif_uddin · Tech content" },
      { title: "Brand collaborations", period: undefined, subtitle: "Creative collaborations · 6 brands" },
      { title: "B.Tech CSE student", period: undefined, subtitle: "Chandigarh University · Mohali" }
    ],
    milestonesLabel: "A FEW MILESTONES",
    milestonesTitleWhite: "LITTLE WINS",
    milestonesTitleRed: "BIG MEANING",
    milestones: [
      { title: "GitRoasted launch", year: undefined },
      { title: "ReviewPilot", year: undefined },
      { title: "Brand collaboration", year: undefined },
      { title: "Hackathon participation", year: undefined }
    ]
  },
  contact: {
    eyebrow: "04 / YOUR NEXT STORY",
    title: "LET'S WORK TOGETHER",
    introduction: "Got a product idea? Let's build something worth shipping.",
    cta: "START THE CONVERSATION",
    email: undefined,
    emailLabel: "EMAIL",
    socials: [
      { label: "X", value: "@md_kasif_uddin", href: "https://x.com/md_kasif_uddin", icon: "x" },
      { label: "INSTAGRAM", value: "@M_Kasif_Uddin", href: "https://instagram.com/M_Kasif_Uddin", icon: "instagram" },
      { label: "GITHUB", value: "MdKasif0", href: "https://github.com/MdKasif0", icon: "github" },
      { label: "SUPPORT", value: "buymeacoffee.com/mdkasif", href: "https://buymeacoffee.com/mdkasif", icon: "coffee" }
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
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || undefined,
  sections: []
} as const;
