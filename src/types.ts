export type PortalView = 'landing' | 'participant' | 'admin';

export interface Participant {
  id: string;
  fullName: string;
  college: string;
  department: string;
  semester: string;
  email: string;
  phone: string;
  usn: string;
  gender: string;
  githubUrl?: string;
  linkedinUrl?: string;
  role: 'Leader' | 'Member';
  teamId: string;
  accommodationRequired: boolean;
  emergencyContact: string;
  checkedIn: boolean;
  checkInTime?: string;
  foodCouponsClaimed?: {
    lunch1: boolean;
    dinner1: boolean;
    midnightSnack: boolean;
    breakfast2: boolean;
    lunch2: boolean;
  };
}

export interface Team {
  id: string; // Team ID like AN-001 or CODE-1001
  regNumber: string;
  teamName: string;
  leaderEmail: string;
  accessPassword?: string;
  domain?: string;
  preferredTrack: string;
  members: Participant[];
  status: 'Registered' | 'Shortlisted' | 'Confirmed' | 'Checked-In' | 'Submitted';
  createdAt: string;
  projectSubmitted?: boolean;
  paymentUtr?: string;
  paymentStatus?: 'Pending' | 'Verified' | 'Rejected';
  paymentScreenshot?: string | null;
  credentialDeliveryStatus?: 'queued' | 'accepted' | 'failed' | 'delivered';
}

export interface ProjectSubmission {
  id: string;
  teamId: string;
  teamName: string;
  track: string;
  projectTitle: string;
  problemStatement: string;
  technologyStack: string[];
  architectureOverview: string;
  githubLink: string;
  demoVideoUrl?: string;
  pptUrl?: string;
  pdfDocUrl?: string;
  futureScope: string;
  submittedAt: string;
  evaluated: boolean;
}

export interface JudgeScorecard {
  id: string;
  submissionId: string;
  teamId: string;
  judgeName: string;
  innovation: number; // Max 15
  impact: number; // Max 15
  technicalComplexity: number; // Max 20
  presentation: number; // Max 15
  uiUx: number; // Max 15
  scalability: number; // Max 10
  originality: number; // Max 10
  bonusPoints: number; // Max 5
  penalty: number; // Deducted
  totalScore: number; // Max 105
  feedback: string;
}

export interface Mentor {
  id: string;
  name: string;
  photo: string;
  designation: string;
  company: string;
  linkedin: string;
  domains: string[];
  availableSlots: string[];
}

export interface MentorBooking {
  id: string;
  teamId: string;
  teamName: string;
  mentorId: string;
  mentorName: string;
  slot: string;
  topic: string;
  status: 'Pending' | 'Confirmed' | 'Completed';
}

export interface Judge {
  id: string;
  name: string;
  photo: string;
  designation: string;
  company: string;
  linkedin: string;
  expertise: string[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'Important' | 'Schedule' | 'Review' | 'General';
  timestamp: string;
  urgent?: boolean;
}

export interface SupportTicket {
  id: string;
  teamId: string;
  teamName: string;
  subject: string;
  message: string;
  category: 'Tech' | 'Food' | 'Accommodation' | 'Internet' | 'Other';
  status: 'Open' | 'In Progress' | 'Resolved';
  createdAt: string;
  response?: string;
}

export interface Sponsor {
  id: string;
  name: string;
  category: 'Title' | 'Gold' | 'Silver' | 'Community' | 'Technology' | 'Media' | 'Hiring';
  logo: string;
  website: string;
  description?: string;
}

export interface HackathonTrack {
  id: string;
  title: string;
  iconName: string;
  description: string;
  problemExamples: string[];
  expectedSolutions: string;
  tags: string[];
  color: string;
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  description: string;
  type: 'general' | 'keynote' | 'food' | 'review' | 'submission';
  day: 1 | 2;
  location: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: 'Registration' | 'Eligibility' | 'Rules' | 'Venue & Logistics' | 'Submissions';
}

export interface MilestoneReport {
  id: string;
  teamId: string;
  checkpointNumber: 1 | 2 | 3;
  checkpointName: string;
  summary: string;
  repoBranchOrLink?: string;
  blockers?: string;
  status: 'Pending' | 'Approved' | 'Needs Changes';
  submittedAt: string;
  feedback?: string;
}

export interface Checkpoint {
  id: string;
  number: number;
  title: string;
  description: string;
  time: string;
  status: 'Open' | 'Closed';
}

export interface WebsiteCMSConfig {
  eventName: string;
  eventSubName: string;
  collegeName: string;
  departmentName: string;
  eventDates: string;
  venueLocation: string;
  totalPrizePool: string;
  firstPrize: string;
  secondPrize: string;
  thirdPrize: string;
  contactEmail: string;
  contactPhone: string;
  registrationOpen: boolean;
  enableMilestoneSubmissions?: boolean;
  enableMentorBookings?: boolean;
  enableCertificateDownloads?: boolean;
  enableProjectSubmissions?: boolean;
  enableSupportTickets?: boolean;
  enableAnnouncements?: boolean;
  homeSections?: {
    hero: boolean;
    about: boolean;
    themes: boolean;
    schedule: boolean;
    prizes: boolean;
    sponsors: boolean;
    faq: boolean;
    contact: boolean;
  };
  maxTeamSize?: number;
  minTeamSize?: number;
  maxRegistrations?: number;
  registrationFee?: number;
  gateScanSecretKey?: string;
  maintenanceMode?: boolean;
  freezeRegistrations?: boolean;
  freezeSubmissions?: boolean;
  freezeJudging?: boolean;
}

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'REGISTRATION_MANAGER' | 'CONTENT_MANAGER' | 'JUDGE' | 'MENTOR' | 'VOLUNTEER' | 'CHECKIN_STAFF';

export interface AuditLog {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: AdminRole;
  action: string;
  target: string;
  beforeValue?: string;
  afterValue?: string;
  reason?: string;
  ipAddress: string;
}

export interface JudgingCriteria {
  id: string;
  name: string;
  maxPoints: number;
  weight: number; // percentage
}

export interface JudgingRound {
  id: string;
  roundNumber: number;
  name: string;
  status: 'Upcoming' | 'Active' | 'Locked';
  criteria: JudgingCriteria[];
}

export interface RulebookVersion {
  id: string;
  version: string;
  title: string;
  pdfUrl: string;
  uploadedAt: string;
  active: boolean;
  downloads: number;
  notes?: string;
}

export interface EmailCampaign {
  id: string;
  title: string;
  targetGroup: 'All Participants' | 'Team Leaders' | 'Mentors' | 'Judges' | 'Checked-In Only';
  subject: string;
  body: string;
  status: 'Draft' | 'Scheduled' | 'Sent';
  sentAt?: string;
  recipientCount: number;
}

export interface RoomAllocation {
  id: string;
  blockName: string;
  roomNumber: string;
  gender: 'Boys' | 'Girls' | 'Common';
  capacity: number;
  occupiedCount: number;
  assignedTeamIds: string[];
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  username?: string;
  password?: string;
  role: AdminRole;
  status: 'Active' | 'Suspended';
  createdAt: string;
  lastLogin?: string;
  twoFactorEnabled: boolean;
}

export interface SecuritySession {
  id: string;
  userEmail: string;
  device: string;
  ip: string;
  loginTime: string;
  status: 'Active' | 'Revoked';
}


