export const PROFILES = [
  { slug: 'alex', name: 'Alex Morgan', specialty: 'Programme lead', available: true, source: 'default' },
  { slug: 'mina', name: 'Mina Patel', specialty: 'Research and synthesis', available: true, source: 'profile' },
  { slug: 'jordan', name: 'Jordan Lee', specialty: 'Delivery engineering', available: true, source: 'profile' },
  { slug: 'teo', name: 'Teo Brooks', specialty: 'Quality and verification', available: true, source: 'profile' },
  { slug: 'ivy', name: 'Ivy Chen', specialty: 'Product operations', available: true, source: 'profile' },
  { slug: 'orbit', name: 'Orbit (historical reference)', specialty: 'Profile not found in this Hermes home', available: false, source: 'missing' },
]

export const READY_ITEMS = [
  { id: 'TASK-184', title: 'Map profile discovery states', kind: 'task', status: 'ready', revision: 12 },
  { id: 'TASK-189', title: 'Validate project preflight wording', kind: 'task', status: 'blocked', revision: 7 },
  { id: 'TASK-201', title: 'Review archive lifecycle notes', kind: 'task', status: 'review', revision: 4 },
  { id: 'TASK-207', title: 'Draft operator recovery runbook', kind: 'task', status: 'backlog', revision: 9 },
]

export const PAGINATED_ITEMS = [
  ...READY_ITEMS,
  { id: 'TASK-214', title: 'Reconcile membership audit events', kind: 'task', status: 'triage', revision: 3 },
  { id: 'TASK-219', title: 'Verify objective link migration', kind: 'task', status: 'ready', revision: 5 },
  { id: 'TASK-223', title: 'Audit narrow-width status copy', kind: 'task', status: 'blocked', revision: 8 },
  { id: 'TASK-228', title: 'Prepare synthetic recovery fixture', kind: 'task', status: 'review', revision: 2 },
]

export const BLOCKED_ITEMS = [
  { id: 'TASK-190', title: 'Run canonical host probe', kind: 'task', status: 'running', revision: 16, reason: 'Claimed/running work cannot transfer safely.' },
  { id: 'TASK-191', title: 'Nightly contract scan', kind: 'task', status: 'scheduled', revision: 6, reason: 'Scheduled work remains a retryable blocker while assigned to this member.' },
]

export const INITIAL_GOALS = [
  {
    id: 'GOAL-01',
    title: 'Make project handoffs boring',
    description: 'Every consequential transfer is complete, exact, and recoverable.',
    objectiveIds: ['OBJ-12', 'OBJ-14'],
    archived: false,
  },
  {
    id: 'GOAL-02',
    title: 'Reduce release uncertainty',
    description: 'Make evidence and readiness visible before a decision.',
    objectiveIds: ['OBJ-18'],
    archived: false,
  },
  {
    id: 'GOAL-00',
    title: 'Retire duplicate planning stores',
    description: 'Historical synthetic goal retained for audit context.',
    objectiveIds: [],
    archived: true,
  },
]

export const INITIAL_OBJECTIVES = [
  { id: 'OBJ-12', title: 'All transfer previews enumerate 100% of affected work', goalId: 'GOAL-01', archived: false },
  { id: 'OBJ-14', title: 'Interrupted transfers resume without false success', goalId: 'GOAL-01', archived: false },
  { id: 'OBJ-18', title: 'Release decisions cite fresh verification evidence', goalId: 'GOAL-02', archived: false },
  { id: 'OBJ-21', title: 'Explore operator training format', goalId: null, archived: false },
  { id: 'OBJ-07', title: 'Retain historical objective evidence', goalId: null, archived: true },
]
