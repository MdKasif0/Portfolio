export type NavItem = {
  label: string;
  href: `#${string}`;
};

export type Brand = { name: string; href?: string; logo?: string; width?: number; height?: number; label?: string };

export const portfolioContent = {
  identity: {
    name: "Md Kasif Uddin",
    displayName: "KASIF",
    roles: ["AI Software Engineer", "Backend Architect", "Tech Content Creator"]
  },
  hero: {
    backgroundWord: "PORTFOLIO",
    eyebrow: ["AI ENGINEER / BACKEND ARCHITECT / TECH CREATOR"],
    availability: "OPEN TO WORK",
    /** Change this one line when you get booked, for example "NEXT AVAILABLE: JAN 2027". */
    nextAvailability: "AVAILABLE NOW",
    greeting: "Hello, I'm",
    disciplines: ["AI SOFTWARE ENGINEER &", "BACKEND ARCHITECT"],
    introduction: "I build AI products and the backend systems behind them: LLM pipelines, APIs and data models that hold up in production.",
    workCta: "See my work",
    location: "INDIA",
    reelLabel: "PLAY REEL",
    reelMetadata: "AI · BACKEND",
    reels: [
      {
        id: "kasif",
        title: "KASIF",
        tagline: "Every idea can ship",
        description: "A 30-second launch film. Every idea is an unfinished sentence until a red full stop lands on it, moving through GitRoasted, Cookie, Shadow of the Crimson Gate, AI Checkers Arena, Object Detection and the Kerr black hole, then the site building itself.",
        duration: 30,
        poster: "/reel/kasif-reel-poster.jpg",
        thumb: "/reel/kasif-reel-thumb.jpg",
        sources: [
          { height: 2160, label: "4K", src: "/reel/kasif-reel-2160.mp4" },
          { height: 1080, label: "1080p", src: "/reel/kasif-reel-1080.mp4" },
          { height: 720, label: "720p", src: "/reel/kasif-reel-720.mp4" }
        ],
        previews: { src: "/reel/kasif-reel-previews.jpg", columns: 10, rows: 6, interval: 0.5 },
        chapters: [
          { title: "Every idea", start: 0 },
          { title: "The developer", start: 3.086 },
          { title: "GitRoasted", start: 5.658 },
          { title: "Cookie", start: 11.831 },
          { title: "Crimson Gate", start: 15.946 },
          { title: "The range", start: 19.032 },
          { title: "The build", start: 22.119 },
          { title: "Your idea", start: 26.234 }
        ],
        credit: {
          track: "“Electron Wake [techno]”",
          artist: "Hardcore Scm",
          license: "CC BY 3.0",
          href: "https://www.jamendo.com/track/1196244",
          licenseHref: "https://creativecommons.org/licenses/by/3.0/"
        }
      },
      {
        id: "cookie",
        title: "Cookie",
        tagline: "A tiny cat that lives on your desktop",
        description: "The launch film for Cookie, a tiny desktop companion for Windows and macOS: she rests beside your work, follows your cursor, plays with treats and toys, stays fully offline and uses almost no idle CPU.",
        duration: 21.633,
        poster: "/reel/cookie-poster.jpg",
        thumb: "/reel/cookie-thumb.jpg",
        sources: [
          { height: 1080, label: "1080p", src: "/reel/cookie-1080.mp4" },
          { height: 720, label: "720p", src: "/reel/cookie-720.mp4" }
        ],
        previews: { src: "/reel/cookie-previews.jpg", columns: 10, rows: 5, interval: 0.5 },
        chapters: [
          { title: "Meet Cookie", start: 0 },
          { title: "Always there", start: 2.9 },
          { title: "Curious", start: 4.23 },
          { title: "Pick her up", start: 6.8 },
          { title: "Treats & toys", start: 8.6 },
          { title: "Make her yours", start: 10 },
          { title: "Quiet by design", start: 14.7 },
          { title: "Say hello", start: 17.63 }
        ]
      },
      {
        id: "shiftkit",
        title: "ShiftKit",
        tagline: "Every file. One gesture.",
        description: "The launch film for ShiftKit, a native macOS utility: hold Shift while dragging a file and a radial ring of actions opens under your cursor to convert, crop, compress, trim and merge, with every file staying on your Mac.",
        duration: 86.3,
        poster: "/reel/shiftkit-poster.jpg",
        thumb: "/reel/shiftkit-thumb.jpg",
        sources: [
          { height: 1080, label: "1080p", src: "/reel/shiftkit-1080.mp4" },
          { height: 720, label: "720p", src: "/reel/shiftkit-720.mp4" }
        ],
        previews: { src: "/reel/shiftkit-previews.jpg", columns: 10, rows: 9, interval: 1 },
        chapters: [
          { title: "Every file", start: 0 },
          { title: "How it works", start: 12 },
          { title: "Crop", start: 24 },
          { title: "Compress & trim", start: 30 },
          { title: "Merge & clean", start: 38 },
          { title: "On your Mac", start: 48 },
          { title: "Every format", start: 54 },
          { title: "One queue", start: 62 },
          { title: "Native & open", start: 70 },
          { title: "Get ShiftKit", start: 78 }
        ]
      },
      {
        id: "gitroasted",
        title: "GitRoasted",
        tagline: "Analyze. Roast. Improve.",
        description: "The launch film for GitRoasted: your GitHub profile quietly documents everything you build, so it scores your commits, roasts them, puts you on the Hall of Flame leaderboard and hands you the fixes.",
        duration: 46.059,
        poster: "/reel/gitroasted-poster.jpg",
        thumb: "/reel/gitroasted-thumb.jpg",
        sources: [
          { height: 1080, label: "1080p", src: "/reel/gitroasted-1080.mp4" },
          { height: 720, label: "720p", src: "/reel/gitroasted-720.mp4" }
        ],
        previews: { src: "/reel/gitroasted-previews.jpg", columns: 10, rows: 5, interval: 1 },
        chapters: [
          { title: "The recruiter", start: 0 },
          { title: "Your profile", start: 7.5 },
          { title: "Every commit", start: 13 },
          { title: "The product", start: 17 },
          { title: "Analyze. Roast.", start: 24 },
          { title: "Hall of Flame", start: 29 },
          { title: "The roast", start: 33 },
          { title: "The fixes", start: 35 },
          { title: "Try it", start: 42 }
        ]
      }
    ],
    reelContactLabel: "Let's talk",
    cutoutAlt: "Portrait of Md Kasif Uddin",
    cutoutPlaceholder: "ADD CUTOUT · /public/hero-cutout.webp",
    stats: [
      { value: "3+", label: "YEARS BUILDING" },
      { value: "10+", label: "PROJECTS SHIPPED" },
      { value: "20+", label: "BRAND COLLABS" }
    ],
    cvLabel: "DOWNLOAD CV",
    cvHref: "/cv.pdf",
    asideNote: "Fast to ship. Built to hold.",
    scrollLabel: "SCROLL TO DISCOVER +",
    footerLabel: "SELECTED WORK · 2025–2026",
    cutoutPath: "/hero-cutout.webp"
  },
  navigation: [
    { label: "Work", href: "#work" },
    { label: "Recognition", href: "#recognition" },
    { label: "About", href: "#about" },
    { label: "Journey", href: "#journey" },
    { label: "Services", href: "#services" },
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
        stack: ["Next.js", "TypeScript", "Groq", "Firebase", "PWA"],
        art: "gitroasted",
        cover: "gitroasted",
        clip: "/work/clips/gitroasted.mp4"
      },
      {
        title: "Cookie",
        tag: "DESKTOP COMPANION",
        subtitle: "A quiet, warm desktop cat for macOS and Windows.",
        categories: ["macOS"],
        year: "2026",
        href: "https://cookie-v1.netlify.app/",
        githubHref: "https://github.com/MdKasif0/Cookie",
        liveHref: "https://cookie-v1.netlify.app/",
        overview: "A lightweight, fully offline desktop companion for macOS and Windows that roams your windows and Dock with real physics, adapts to what you're working on, and never sends a byte of data anywhere.",
        role: "Native macOS app · Design & engineering",
        stack: ["Swift", "SwiftUI", "SpriteKit", "Sparkle"],
        art: "cookie",
        cover: "cookie",
        clip: "/work/clips/cookie.mp4"
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
        overview: "Real-time katana combat with dashes and combos, multi-phase yokai boss fights, moonlit atmospheric lighting and layered sound, all running in the browser on a custom Three.js engine with saved progress.",
        role: "Game design · Engine & graphics programming",
        stack: ["Three.js", "TypeScript", "WebGL", "Web Audio API"],
        art: "crimson",
        cover: "shadow-of-the-crimson-gate",
        clip: "/work/clips/crimson.mp4"
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
        cover: "kerr-black-hole",
        clip: "/work/clips/kerr-black-hole.mp4"
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
        cover: "ai-checkers-arena",
        clip: undefined
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
        cover: "object-detection-suite",
        clip: "/work/clips/object-detection.mp4"
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
    /** Split in two for the rows. Logos are captured from each brand's own site, with neutral ink turned white for the dark background. */
    rowSplit: 7,
    brands: [
      { name: "HellYeah.ai", href: "https://www.hellyeahai.com/", logo: "/brands/hellyeah.png", width: 129, height: 24 },
      { name: "Moonshot AI", href: "https://www.moonshot.ai/", logo: "/brands/moonshot.png", width: 153, height: 25 },
      { name: "TinyFish", href: "https://www.tinyfish.ai/", logo: "/brands/tinyfish.png", width: 117, height: 26 },
      { name: "Tavus", href: "https://www.tavus.io/", logo: "/brands/tavus.png", width: 111, height: 22 },
      { name: "AgentMail", href: "https://www.agentmail.to/", logo: "/brands/agentmail.png", width: 144, height: 26 },
      { name: "Context.dev", href: "https://www.context.dev/", logo: "/brands/contextdev.png", width: 147, height: 23 },
      { name: "Yapper.so", href: "https://yapper.so/", logo: "/brands/yapper.png", width: 116, height: 24 },
      { name: "SuperApp", href: "https://superapp.dev/", logo: "/brands/superapp.png", width: 123, height: 32 },
      { name: "daily.dev", href: "https://daily.dev/", logo: "/brands/dailydev.png", width: 136, height: 24 },
      { name: "AgentID", href: "https://www.agentid.com/", logo: "/brands/agentid.png", width: 123, height: 28 },
      { name: "Shift", href: "https://www.shiftapp.nyc/", logo: "/brands/shift.png", width: 86, height: 24 },
      { name: "Blackbox AI", href: "https://www.blackbox.ai/", logo: "/brands/blackbox.png", width: 130, height: 20 },
      { name: "Kimi", href: "https://www.kimi.com/", logo: "/brands/kimi.png", width: 30, height: 30, label: "Kimi" }
    ] as Brand[]
  },
  recognition: {
    eyebrow: "RECOGNITION & COLLABS",
    titleWhite: "THE WORK",
    titleRed: "THE RECOGNITION",
    count: 22,
    countSuffix: "+",
    countLabel: "Hackathons and collaborations",
    breakdown: [
      { value: "2", label: "Hackathons" },
      { value: "20+", label: "Brand collaborations" }
    ],
    entries: [
      { title: "GigSense", result: "1ST RUNNER-UP", type: "Solo hackathon", year: "2026", event: "InnoSprint 2.0 · D4 Community × Google for Developers · Chandigarh University", description: "A financial intelligence and evidence ledger for gig couriers.", href: "/certificates/innosprint-2-0.pdf", linkLabel: "View certificate", projectHref: "https://gigsense-v1.netlify.app/", projectLabel: "View project", showPartners: false },
      { title: "TrustLayer", result: undefined, type: "Hackathon", year: "2026", event: "Hackverse · Terrabyte Society, Chandigarh University", description: "Multi-layer media verification.", href: "https://trustlayer-v1.netlify.app/", linkLabel: "View project", projectHref: undefined, projectLabel: undefined, showPartners: false },
      { title: "Brand collaborations", result: undefined, type: "Collaborations", year: "2026", event: undefined, description: "20+ creative collaborations with AI and tech brands.", href: undefined, linkLabel: undefined, projectHref: undefined, projectLabel: undefined, showPartners: true }
    ]
  },
  architecture: {
    eyebrow: "A LOOK UNDER THE SURFACE",
    titleLines: ["EVERY SYSTEM", "IS A MACHINE."],
    caption: "Three real systems, each built as a working machine you can watch run. Every step maps to real code. Click any part to see what it does.",
    tabsLabel: "Choose a system",
    tradeOffsLabel: "The calls behind it",
    caseStudyLabel: "Read the full case study",
    sourceLabel: "Read the source"
  },
  writing: {
    eyebrow: "BUILDING IN PUBLIC",
    titleLines: ["BUILT IN THE OPEN."],
    handle: "@md_kasif_uddin",
    profileHref: "https://x.com/md_kasif_uddin",
    followers: "6,500+",
    followersLabel: "followers on X",
    intro: "Notes on AI, Python and shipping things, written while they're being built.",
    cta: "Follow along on X",
    readLabel: "Read on X",
    githubLabel: "On GitHub",
    githubCta: "See the code",
    postsLabel: "On X",
    notesLabel: "Engineering notes",
    notesCta: "All notes",
    /** Real posts, with counts as of November 2026. Images load from X's own CDN, and a card drops its image if one ever goes missing. */
    posts: [
      {
        date: "Jan 2026",
        text: "Built this real time hand tracking physics engine entirely using Gemini 3 Pro in @arena. The accuracy is insane.",
        href: "https://x.com/md_kasif_uddin/status/2009594268332241062",
        image: "https://pbs.twimg.com/ext_tw_video_thumb/2009594041277788160/pu/img/Ygf_FZH1_U_aVe42.jpg?name=small",
        views: "99.8K",
        likes: 45,
        replies: 9
      },
      {
        date: "Mar 2026",
        text: "Just made a quick edit on OpenAI’s AI tools. What do you think? 👀 (Note: Clips used in this video are from OpenAI’s official channels)",
        href: "https://x.com/md_kasif_uddin/status/2036752264057270381",
        image: "https://pbs.twimg.com/ext_tw_video_thumb/2036752093596602369/pu/img/UK-veG2j-IHSfBSW.jpg?name=small",
        views: "130.7K",
        likes: 160,
        replies: 39
      },
      {
        date: "Jan 2026",
        text: "Just built a few landing page designs using Stitch. Which one’s the best? 👀",
        href: "https://x.com/md_kasif_uddin/status/2008492252705030491",
        image: "https://pbs.twimg.com/media/G9-ZB6EbYAAbwpv.jpg?format=jpg&name=small",
        views: "1.9M",
        likes: 111,
        replies: 60
      }
    ]
  },
  services: {
    eyebrow: "04 / WHAT I BUILD",
    titleLines: ["WHAT I BUILD."],
    intro: "Three ways to work together. You talk to the person writing the code, from the first call to the launch.",
    note: "Timelines are typical. I'll confirm yours after a first look at the scope.",
    timelineLabel: "Typical timeline",
    startLabel: "Start this project",
    proofLabel: "See one",
    /** Set NEXT_PUBLIC_CAL_LINK on Netlify to your Cal.com link and the booking button appears here and in Contact. */
    bookLabel: "Book a 15-minute call",
    bookHref: process.env.NEXT_PUBLIC_CAL_LINK || "",
    offers: [
      {
        id: "ai-mvp",
        title: "AI product MVP",
        timeline: "2–4 weeks",
        summary: "From an idea to a live product people can actually use.",
        includes: ["LLM pipeline and prompts", "APIs and data model", "A working interface", "Deployed, with real error handling"],
        proof: "GitRoasted",
        proofHref: "/work/gitroasted"
      },
      {
        id: "backend-api",
        title: "Backend and API build",
        timeline: "1–3 weeks",
        summary: "The services behind a product, built to hold up under real use.",
        includes: ["API design and data modelling", "Auth, storage and integrations", "Limits, caching and failure paths", "Deployment and handover notes"],
        proof: "AI Checkers Arena",
        proofHref: "https://github.com/MdKasif0/AI-Checkers-Arena"
      },
      {
        id: "ai-features",
        title: "AI features for your product",
        timeline: "1–2 weeks",
        summary: "AI added to an app you already run, without breaking what works.",
        includes: ["Chat, search, summaries or scoring", "Model choice and fallbacks", "Cost and prompt limits", "Validated output before users see it"],
        proof: "GigSense",
        proofHref: "https://gigsense-v1.netlify.app/"
      }
    ]
  },
  about: {
    eyebrow: "02 / HOW I BUILD",
    titleBefore: "FAST TO SHIP",
    titleAfter: "BUILT TO HOLD",
    bioLines: [
      "A developer fueled by audacity: convinced every idea is shippable, then actually shipping it.",
      "AI software engineer and backend architect, building LLM-powered products, APIs and data systems, plus native desktop apps, from the first sketch to production.",
      "Building in public as a tech creator on X, @md_kasif_uddin."
    ],
    educationLabel: "Education",
    educationDegree: "B.Tech CSE",
    educationSchool: "Chandigarh University, Mohali",
    educationStatus: "1st year, 2026 — now",
    toolkitLabel: "The stack",
    toolkitGroups: [
      { label: "Languages", skills: ["TypeScript", "JavaScript", "Python", "Swift"] },
      { label: "Backend & Data", skills: ["Node.js", "Supabase", "Firebase", "PostgreSQL"] },
      { label: "AI & ML", skills: ["OpenAI", "Gemini", "Hugging Face", "TensorFlow"] },
      { label: "Frontend", skills: ["React", "Next.js", "Tailwind CSS", "Three.js"] },
      { label: "Tools", skills: ["Git", "Figma", "Docker", "n8n", "Netlify"] }
    ],
    processLabel: "From idea to final ship",
    process: [
      { title: "The idea", description: "Start with a need, question or rough sketch worth exploring." },
      { title: "The plan", description: "Map the data model, services and failure paths before building features." },
      { title: "The build", description: "Build the services and the interface together, as one working system." },
      { title: "The hardening", description: "Harden error handling and performance, then refine the details." },
      { title: "The launch", description: "Check the final experience and prepare it to ship." }
    ],
    quote: "From first idea to production, built to hold up.",
    signature: "Kasif",
    quoteFooter: "Let's make the next build count."
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
      "Taking rough ideas all the way to production."
    ],
    roles: [
      { title: "Tech Content Creator on X", period: "2026", subtitle: "@md_kasif_uddin · AI, dev tools and building in public" },
      { title: "Brand collaborations", period: "2026", subtitle: "20+ collaborations with AI and tech brands" },
      { title: "B.Tech CSE student", period: "2026", subtitle: "Chandigarh University, Mohali · First year" }
    ],
    experienceLabel: "Experience",
    milestonesLabel: "A few milestones",
    milestones: [
      { title: "Launched GitRoasted", year: "2025", href: "https://gitroasted.netlify.app/" },
      { title: "Shipped GigSense", year: "2026", href: "https://gigsense-v1.netlify.app/" },
      { title: "20+ brand collaborations", year: "2026", href: "#recognition" },
      { title: "1st Runner-Up, InnoSprint 2.0", year: "2026", href: "/certificates/innosprint-2-0.pdf" }
    ]
  },
  contact: {
    eyebrow: "05 / YOUR NEXT BUILD",
    title: "LET'S WORK TOGETHER",
    introduction: "Got a product idea? Let's build something worth shipping.",
    formTitle: "Start a project",
    formSubtitle: "Tell me what you're building.",
    budgets: ["Under $1k", "$1k — $3k", "$3k+"],
    formSubmit: "Send project",
    formSending: "Sending…",
    formSentTitle: "Message sent",
    formSentBody: "Thanks. I'll reply by email.",
    formSendAnother: "Send another",
    formError: "That didn't send. Please email me instead:",
    email: "mdkasifuddin123@gmail.com",
    emailLabel: "Email",
    socials: [
      { label: "X", value: "@md_kasif_uddin", href: "https://x.com/md_kasif_uddin", icon: "x" },
      { label: "GitHub", value: "MdKasif0", href: "https://github.com/MdKasif0", icon: "github" }
    ],
    locationLabel: "Based in",
    location: "India",
    offerLabel: "About",
    offerClear: "Clear",
    reelKicker: "The reel",
    reelTitle: "WATCH IT RUN.",
    reelMeta: "Four launch films, from 21 seconds to 86",
    modalLabel: "Play the reel",
    reelModalKicker: "KASIF / SHOWREEL"
  },
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "https://kasif-portfolio.netlify.app",
  sections: []
} as const;
