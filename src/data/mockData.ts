import { HackathonTrack, ScheduleItem, Sponsor, Judge, Mentor, FAQItem, Team, Announcement, SupportTicket, ProjectSubmission, JudgeScorecard } from '../types';

export const INDIA_STATES_AND_UTS = [
'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu',
'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'

] as const;

export const COLLEGE_INFO = {
  name: 'K. S. School of Engineering & Management',
  acronym: 'KSSEM',
  trust: 'Kammavari Sangham (R) 1952 | K. S. Group of Institutions',
  department: 'Department of Computer Science and Engineering',
  associatedDepts: ['AI&DS', 'CS&BS', 'ECE'],
  hodName: 'Dr. K Venkata Rao',
  hodTitle: 'Professor & Head, Dept of CSE',
  principalName: 'Prof. Suresh Ramaswwamyreddy',
  principalTitle: 'Principal & Director, KSSEM',
  address: 'No. 15, Mallasandra, off. Kanakapura Road, Bengaluru - 560109, Karnataka, India',
  phone: '+91 9900710055 / +91 80 28425012',
  email: 'anvation2026@kssem.edu.in',
  affiliations: [
    'Approved by AICTE',
    'Affiliated to VTU',
    'Accredited by NAAC',
    'Accredited by NBA',
  ],
  eventTitle: 'Anvation',
  eventTagline: 'explore, innovate, transform',
  dates: '8th - 9th October 2026',
  time: '9:30 AM to 9:30 AM (24-Hour Non-stop Hackathon)',
  venue: 'KSSEM Campus, Bengaluru',
  entryFee: '₹250 per participant',
  teamSize: '2-4 Members',
  prizePool: '₹50,000',
  totalSeats: 350,
  registeredCount: 312,
  collegesCount: 48,
  citiesCount: 14,
  projectsCount: 78,
  socials: {
    instagram: '@kssemofficial',
    cseInstagram: '@kssem_cse',
    facebook: '@kssemofficial',
    website: 'www.kssem.edu.in'
  },
  leadershipChairs: [
    {
      name: 'Dr. K Venkata Rao',
      title: 'Professor & Head',
      dept: 'Department of CSE',
      badgeColor: 'from-pink-600 to-rose-600'
    },
    {
      name: 'Dr. Manjunath T K',
      title: 'Professor & Head',
      dept: 'Department of AI&DS',
      badgeColor: 'from-fuchsia-600 to-purple-600'
    },
    {
      name: 'Dr. K Senthil Babu',
      title: 'Professor & Head',
      dept: 'Department of ECE',
      badgeColor: 'from-amber-500 to-orange-600'
    },
    {
      name: 'Prof. Ramesh Babu. N',
      title: 'Professor & Head',
      dept: 'Department of CS&BS',
      badgeColor: 'from-cyan-600 to-blue-600'
    },
    {
      name: 'Prof. Suresh Ramaswwamyreddy',
      title: 'Principal & Director',
      dept: 'KSSEM Bengaluru',
      badgeColor: 'from-emerald-600 to-teal-600'
    }
  ],
  facultyCoordinators: [
    {
      name: 'Dr. Sivasubramanyam Medasani',
      role: 'Faculty Coordinator',
      dept: 'Dept. of Computer Science & Engineering',
      phone: '+91 8309763125'
    },
    {
      name: 'Mr. Harshavardhan J R',
      role: 'Faculty Coordinator',
      dept: 'Dept. of Computer Science & Engineering',
      phone: '+91 94486 12519'
    },
    {
      name: 'Ms. Vidyasre. N',
      role: 'Faculty Coordinator',
      dept: 'Dept. of Computer Science & Engineering',
      phone: '+91 7975940301'
    }
  ],
  studentCoordinators: [
    {
      name: 'Bhaskar S',
      role: 'Lead Student Coordinator',
      dept: 'CSE, KSSEM Bengaluru',
      phone: '+91 9663949447'
    },
    {
      name: 'Karanam Vennela',
      role: 'Lead Student Coordinator',
      dept: 'CSE, KSSEM Bengaluru',
      phone: '+91 9019302077'
    }
  ]
};

export const HACKATHON_TRACKS: HackathonTrack[] = [
  {
    id: 'ai-ml',
    title: 'Artificial Intelligence & Machine Learning',
    iconName: 'Brain',
    description: 'Empower intelligent systems with deep neural architectures, LLMs, computer vision, autonomous agents, and predictive models.',
    problemExamples: [
      'Multimodal AI assistant for low-resource regional language transcription and analysis',
      'Real-time traffic and crowd anomaly detection using lightweight computer vision models',
      'Autonomous defect classification for industrial fabrication on edge compute'
    ],
    expectedSolutions: 'Deployable AI pipelines, REST/gRPC API microservices, or interactive edge models with benchmarked accuracy.',
    tags: ['GenAI & LLMs', 'Computer Vision', 'Autonomous Agents', 'Deep Learning'],
    color: 'from-cyan-500 via-sky-600 to-indigo-600'
  },
  {
    id: 'fintech',
    title: 'FinTech & Digital Finance',
    iconName: 'Coins',
    description: 'Build modern payment rails, fraud detection engines, micro-lending platforms, and decentralized transaction audit trails.',
    problemExamples: [
      'Real-time UPI payment anomaly & fraudulent transaction detection engine',
      'Micro-lending credit scoring using alternative digital footprints for rural artisans',
      'Automated tax compliance & invoicing reconciliation tool for Indian SMBs'
    ],
    expectedSolutions: 'Secure payment APIs, cryptographic ledgers, or algorithmic credit scoring interfaces.',
    tags: ['UPI & Payments', 'Fraud Shield', 'Micro-Credit', 'DeFi'],
    color: 'from-purple-500 via-indigo-600 to-violet-600'
  },
  {
    id: 'cybersecurity',
    title: 'Cybersecurity & Privacy',
    iconName: 'ShieldAlert',
    description: 'Safeguard critical infrastructure, build zero-trust security postures, detect deepfakes, and engineer privacy-first systems.',
    problemExamples: [
      'Zero-trust API authentication shield against credential stuffing & botnets',
      'Real-time deepfake audio and video stream detection for digital identity verification',
      'Lightweight privacy-preserving cryptographic vault with biometric authorization'
    ],
    expectedSolutions: 'Security analyzers, browser security shields, SIEM log parsers, or cryptographic privacy engines.',
    tags: ['Zero-Trust', 'Deepfake Detection', 'SIEM / Threat Intel', 'Cryptography'],
    color: 'from-blue-600 via-cyan-600 to-teal-600'
  },
  {
    id: 'smartcities',
    title: 'Smart Cities & CivicTech',
    iconName: 'Building2',
    description: 'Transform municipal governance, urban waste management, smart parking, public transit tracking, and citizen grievance redressal.',
    problemExamples: [
      'AI-powered pothole mapping and civic grievance dispatch system using smartphone cameras',
      'Real-time smart parking grid with ultrasonic sensors and dynamic pricing',
      'Public transit crowd density tracking and optimized bus arrival prediction'
    ],
    expectedSolutions: 'Civic web/mobile portals, GIS mapping systems, or automated municipal dispatch dashboards.',
    tags: ['Urban IoT', 'Civic Portals', 'GIS Mapping', 'Smart Mobility'],
    color: 'from-sky-500 via-blue-600 to-indigo-600'
  },
  {
    id: 'sustainability',
    title: 'Sustainability & ClimateTech',
    iconName: 'Leaf',
    description: 'Combat climate change through real-time carbon footprint calculators, renewable energy grids, and circular economy tools.',
    problemExamples: [
      'Campus energy monitoring ledger optimizing HVAC and lighting based on occupancy',
      'AI plastic waste sorting classifier for automated municipal recycling conveyor belts',
      'Urban air quality monitoring grid with hyper-local particulate forecast alerts'
    ],
    expectedSolutions: 'Carbon tracking dashboards, IoT energy telemetry networks, or circular economy resource exchanges.',
    tags: ['Carbon Footprint', 'Circular Economy', 'Renewable Grid', 'AQI Forecaster'],
    color: 'from-teal-500 via-emerald-600 to-green-600'
  }
];

export const SCHEDULE_DAY1: ScheduleItem[] = [
  { id: 's1', time: '08:30 AM - 09:30 AM', title: 'Participant Check-in & Breakfast', description: 'Badge verification, swag bag collection, and continental breakfast at KSSEM cafeteria.', type: 'food', day: 1, location: 'KSSEM Main Quadrangle' },
  { id: 's2', time: '09:30 AM - 10:30 AM', title: 'Grand Inauguration Ceremony', description: 'Welcome address by Management & Principal, Keynote by Chief Guest from Tech Industry.', type: 'keynote', day: 1, location: 'KSSEM Auditorium' },
  { id: 's3', time: '10:30 AM - 11:00 AM', title: 'Problem Statements & Rules Briefing', description: 'Announcement of track sponsors, judging criteria, and lab allocation.', type: 'general', day: 1, location: 'Auditorium' },
  { id: 's4', time: '11:00 AM', title: 'HACKATHON CLOCK STARTS (24-Hour Timer)', description: 'Teams move to assigned CSE computing labs and initiate development.', type: 'general', day: 1, location: 'CSE Labs (3rd & 4th Floor)' },
  { id: 's5', time: '01:30 PM - 02:30 PM', title: 'Networking Lunch', description: 'Buffet lunch served in college dining hall.', type: 'food', day: 1, location: 'KSSEM Dining Hall' },
  { id: 's6', time: '03:30 PM - 05:00 PM', title: 'Mentoring Session Round 1 (Architecture Review)', description: 'Domain experts and industry mentors review team tech stacks and database schemas.', type: 'review', day: 1, location: 'Respective Team Stations' },
  { id: 's7', time: '05:30 PM - 06:00 PM', title: 'High-Tea & Snacks Break', description: 'Coffee, tea, and evening refreshments.', type: 'food', day: 1, location: 'Lab Foyers' },
  { id: 's8', time: '07:30 PM - 08:30 PM', title: 'Checkpoint 1: Progress Sync', description: 'First code push check on GitHub repositories.', type: 'review', day: 1, location: 'Online Dashboard' },
  { id: 's9', time: '08:30 PM - 09:30 PM', title: 'Dinner Break', description: 'Hot dinner served for all participants.', type: 'food', day: 1, location: 'Dining Hall' },
  { id: 's10', time: '11:00 PM - 12:00 AM', title: 'Midnight Review & Fun Stunts', description: 'Stand-up comedy, gaming arena, and midnight pizza snacks!', type: 'keynote', day: 1, location: 'Seminar Hall 2' }
];

export const SCHEDULE_DAY2: ScheduleItem[] = [
  { id: 's11', time: '02:00 AM - 03:00 AM', title: 'Late Night Mentoring & Debugging Session', description: 'On-demand technical mentors assist with API integration & deployment issues.', type: 'review', day: 2, location: 'CSE Computing Labs' },
  { id: 's12', time: '07:30 AM - 08:30 AM', title: 'Fresh Morning Breakfast', description: 'Healthy breakfast and South Indian filter coffee.', type: 'food', day: 2, location: 'Dining Hall' },
  { id: 's13', time: '09:30 AM - 10:30 AM', title: 'Final Code Freeze & Project Submission', description: 'Submit GitHub links, PPTs, video demos, and project details via Participant Dashboard.', type: 'submission', day: 2, location: 'Participant Portal' },
  { id: 's14', time: '11:00 AM - 01:30 PM', title: 'Judging & Demo Round (Exhibition)', description: 'Jury panel conducts 7-minute presentation + 3-minute Q&A at each team booth.', type: 'review', day: 2, location: 'Exhibition Hall & Labs' },
  { id: 's15', time: '01:30 PM - 02:30 PM', title: 'Grand Lunch', description: 'Lunch break while judges tabulate scores.', type: 'food', day: 2, location: 'Dining Hall' },
  { id: 's16', time: '03:00 PM - 05:00 PM', title: 'Valedictory Ceremony & Prize Distribution', description: 'Keynote speech, distribution of cash prizes, trophies, certificates, and swags.', type: 'keynote', day: 2, location: 'KSSEM Auditorium' }
];

export const HACKATHON_SCHEDULE: ScheduleItem[] = [...SCHEDULE_DAY1, ...SCHEDULE_DAY2];

export const JUDGES: Judge[] = [
  {
    id: 'j1',
    name: 'Dr. Ramesh Kumar',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    designation: 'Principal Scientist & AI Director',
    company: 'Bosch Global Software Technologies',
    linkedin: 'https://linkedin.com/in/dr-ramesh-kumar',
    expertise: ['AI/ML Architecture', 'Embedded Systems', 'Computer Vision']
  },
  {
    id: 'j2',
    name: 'Sowmya N. Rao',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    designation: 'Senior Vice President of Engineering',
    company: 'PhonePe Bengaluru',
    linkedin: 'https://linkedin.com/in/sowmyanrao',
    expertise: ['FinTech Infrastructure', 'Distributed Systems', 'Cybersecurity']
  },
  {
    id: 'j3',
    name: 'Vikramaditya Hegde',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    designation: 'Head of Developer Ecosystems',
    company: 'Google Cloud India',
    linkedin: 'https://linkedin.com/in/vhegde-gcp',
    expertise: ['Cloud Native Solutions', 'Scalability', 'DevOps']
  },
  {
    id: 'j4',
    name: 'Dr. K. Rama Narasimha',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
    designation: 'Principal & Professor',
    company: 'KS School of Engineering & Management',
    linkedin: 'https://linkedin.com/in/kssem-principal',
    expertise: ['Research & Innovation', 'Higher Education', 'Pattern Recognition']
  }
];

export const MENTORS: Mentor[] = [
  {
    id: 'm1',
    name: 'Anand V. Swamy',
    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400',
    designation: 'Staff Software Architect',
    company: 'Atlassian',
    linkedin: 'https://linkedin.com/in/anandvswamy',
    domains: ['Full Stack Web', 'Node.js/React', 'Microservices'],
    availableSlots: ['Day 1 - 04:00 PM', 'Day 1 - 09:30 PM', 'Day 2 - 02:30 AM']
  },
  {
    id: 'm2',
    name: 'Priyanka Deshmukh',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400',
    designation: 'Lead AI Researcher',
    company: 'Microsoft Research India',
    linkedin: 'https://linkedin.com/in/priyankad-ai',
    domains: ['GenAI', 'LLM Fine-tuning', 'PyTorch'],
    availableSlots: ['Day 1 - 04:30 PM', 'Day 1 - 10:00 PM', 'Day 2 - 03:00 AM']
  },
  {
    id: 'm3',
    name: 'Karthik Gowda',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400',
    designation: 'Senior Security Specialist',
    company: 'Cisco Systems',
    linkedin: 'https://linkedin.com/in/karthikgowda-sec',
    domains: ['Cyber Security', 'API Hardening', 'Penetration Testing'],
    availableSlots: ['Day 1 - 05:00 PM', 'Day 1 - 11:30 PM', 'Day 2 - 02:00 AM']
  },
  {
    id: 'm4',
    name: 'Meera Iyer',
    photo: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=400',
    designation: 'Product Design Lead',
    company: 'CRED',
    linkedin: 'https://linkedin.com/in/meeraiyer-design',
    domains: ['UI/UX Design', 'Design Systems', 'Micro-interactions'],
    availableSlots: ['Day 1 - 03:30 PM', 'Day 1 - 08:30 PM', 'Day 2 - 01:30 AM']
  }
];

export const SEED_MENTORS = MENTORS;

export const SPONSORS: Sponsor[] = [
  { id: 'sp1', name: 'Kammavari Sangham Trust', category: 'Title', logo: 'KSSEM', website: 'https://kssem.edu.in', description: 'Primary Management & Patron' },
  { id: 'sp2', name: 'Google Cloud Platform', category: 'Title', logo: 'Google Cloud', website: 'https://cloud.google.com', description: '$10,000 in AI & Compute Credits' },
  { id: 'sp3', name: 'GitHub', category: 'Gold', logo: 'GitHub', website: 'https://github.com', description: 'Official Student Developer Pack Partner' },
  { id: 'sp4', name: 'Postman', category: 'Gold', logo: 'Postman', website: 'https://postman.com', description: 'API Development & Testing Partner' },
  { id: 'sp5', name: 'PhonePe Tech', category: 'Silver', logo: 'PhonePe', website: 'https://phonepe.com', description: 'FinTech Track Sponsor' },
  { id: 'sp6', name: 'MongoDB', category: 'Silver', logo: 'MongoDB', website: 'https://mongodb.com', description: 'Database Atlas Credits' },
  { id: 'sp7', name: 'Devfolio', category: 'Community', logo: 'Devfolio', website: 'https://devfolio.co', description: 'Platform & Hackathon Partner' },
  { id: 'sp8', name: 'Major League Hacking (MLH)', category: 'Community', logo: 'MLH', website: 'https://mlh.io', description: 'Global Student Hackathon Network' },
  { id: 'sp9', name: 'Namma Bengaluru Tech Media', category: 'Media', logo: 'Bengaluru Tech', website: 'https://kssem.edu.in', description: 'Media Coverage Partner' },
  { id: 'sp10', name: 'Bosch Hiring Cell', category: 'Hiring', logo: 'Bosch', website: 'https://bosch.in', description: 'Direct Internship & FTE Interview Fast-Track' }
];

export const FAQS: FAQItem[] = [
  {
    question: 'Who is eligible to participate in Anvation 2026?',
    answer: 'Any currently enrolled undergraduate (B.E./B.Tech) student from any recognized institution across India is eligible.',
    category: 'Eligibility'
  },
  {
    question: 'What is the permitted team size and composition?',
    answer: 'Teams must consist of 2 to 4 members (1 Leader + 1 to 3 Additional Members). Cross-departmental and cross-college teams are strongly encouraged!',
    category: 'Registration'
  },
  {
    question: 'Is there any registration fee?',
    answer: 'The registration fee is ₹250 per head payable via PhonePe (test mode). Food, snacks, high-speed Wi-Fi, and overnight accommodation are fully provided by KSSEM.',
    category: 'Registration'
  },
  {
    question: 'Will accommodation and food be provided on campus?',
    answer: 'Yes! KSSEM provides separate secure overnight resting areas for male and female participants, 24x7 security, high-speed Wi-Fi, along with 3 meal rounds and midnight snacks.',
    category: 'Venue & Logistics'
  },
  {
    question: 'What items should participants bring to the venue?',
    answer: 'Participants must bring their college ID card, personal laptop, chargers, extension cords, hardware components (if submitting hardware track), and necessary toiletries for overnight stay.',
    category: 'Venue & Logistics'
  },
  {
    question: 'What deliverables are required for final submission?',
    answer: 'Every team must submit a public GitHub repository with commit history during the event, a 3-minute video demo or live pitch, and a presentation slide deck (PPT/PDF).',
    category: 'Submissions'
  }
];

export const SEED_TEAMS: Team[] = [];

export const SEED_SUBMISSIONS: ProjectSubmission[] = [];

export const SEED_SCORECARDS: JudgeScorecard[] = [];

export const SEED_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: '🚀 Anvation 2026 Inauguration at 09:30 AM in Auditorium',
    content: 'All registered participants are requested to assemble in the main KSSEM Auditorium for the keynote address by Bosch & Google Cloud leaders.',
    category: 'Schedule',
    timestamp: '2026-10-16T09:00:00Z',
    urgent: true
  },
  {
    id: 'ann-2',
    title: '🍕 Midnight Snacks & Fun Stunts at Seminar Hall 2 (11:30 PM)',
    content: 'Take a break from coding! Head over to Seminar Hall 2 for piping hot pizzas, gaming arena, and stand-up comedy.',
    category: 'General',
    timestamp: '2026-10-16T23:00:00Z'
  },
  {
    id: 'ann-3',
    title: '⏰ Final Code Freeze at 09:30 AM sharp tomorrow',
    content: 'Please ensure your GitHub repository is updated with your latest commit and project details are submitted on your dashboard.',
    category: 'Important',
    timestamp: '2026-10-17T07:00:00Z',
    urgent: true
  }
];
