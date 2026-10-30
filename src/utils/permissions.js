const ROLE_PERMISSIONS = {
  Admin: {
    users: {
      view: ['Admin', 'HR', 'Employee', 'Intern'],
      create: ['HR', 'Employee', 'Intern'],
      update: ['HR', 'Employee', 'Intern'],
      deactivate: ['HR', 'Employee', 'Intern'],
      reactivate: ['HR', 'Employee', 'Intern'],
      delete: [],
    },
    projects: {
      view: ['all'],
      create: true,
      update: true,
      publish: true,
      archive: true,
      restore: true,
      delete: false,
    },
    timeline: {
      view: ['all'],
      main: {
        view: ['all'],
        post: true,
        reply: true,
        upload: true,
        deleteOwn: true,
        deleteAny: true,
      },
      staff: {
        view: ['all'],
        post: true,
        reply: true,
        upload: true,
        deleteOwn: true,
        deleteAny: true,
      },
    },
  },

  HR: {
    users: {
      view: ['Employee', 'Intern'],
      create: ['Employee', 'Intern'],
      update: ['Employee', 'Intern'],
      deactivate: ['Employee', 'Intern'],
      reactivate: ['Employee', 'Intern'],
      delete: [],
    },
    projects: {
      view: ['all'],
      create: true,
      update: true,
      publish: true,
      archive: true,
      restore: true,
      delete: false,
    },
    timeline: {
      view: ['assigned'],
      main: {
        view: ['assigned'],
        post: true,
        reply: true,
        upload: true,
        deleteOwn: true,
        deleteAny: true,
      },
      staff: {
        view: ['assigned'],
        post: true,
        reply: true,
        upload: true,
        deleteOwn: true,
        deleteAny: true,
      },
    },
  },

  Employee: {
    users: {
      view: ['self', 'projectMembers'],
      create: [],
      update: [],
      deactivate: [],
      reactivate: [],
      delete: [],
    },
    projects: {
      view: ['assigned'],
      create: false,
      update: false,
      publish: false,
      archive: false,
      restore: false,
      delete: false,
    },
    timeline: {
      view: ['assigned'],
      main: {
        view: ['assigned'],
        post: true,
        reply: true,
        upload: true,
        deleteOwn: true,
        deleteAny: false,
      },
      staff: {
        view: ['assigned'],
        post: false,
        reply: false,
        upload: false,
        deleteOwn: false,
        deleteAny: false,
      },
    },
  },

  Intern: {
    users: {
      view: ['self', 'projectMembers'],
      create: [],
      update: [],
      deactivate: [],
      reactivate: [],
      delete: [],
    },
    projects: {
      view: ['assigned'],
      create: false,
      update: false,
      publish: false,
      archive: false,
      restore: false,
      delete: false,
    },
    timeline: {
      view: ['assigned'],
      main: {
        view: ['assigned'],
        post: true,
        reply: true,
        upload: true,
        deleteOwn: true,
        deleteAny: false,
      },
      staff: {
        view: ['assigned'],
        post: false,
        reply: false,
        upload: false,
        deleteOwn: false,
        deleteAny: false,
      },
    },
  },
};

const normalizeRole = (role) => {
  if (typeof role !== 'string') return '';

  const roles = {
    admin: 'Admin',
    hr: 'HR',
    employee: 'Employee',
    intern: 'Intern',
  };

  return roles[role.trim().toLowerCase()] || role.trim();
};

const getRole = (user) => normalizeRole(user?.role);

const isActiveUser = (user) =>
  Boolean(user) &&
  user.isActive !== false &&
  user.is_active !== false &&
  user.active !== false;

const hasRole = (user, roles) => {
  if (!user) return false;

  const role = getRole(user);

  if (Array.isArray(roles)) {
    return roles.map(normalizeRole).includes(role);
  }

  return role === normalizeRole(roles);
};

const isAdministrator = (user) => hasRole(user, 'Admin');

const isHR = (user) => hasRole(user, 'HR');

const isEmployee = (user) => hasRole(user, 'Employee');

const isIntern = (user) => hasRole(user, 'Intern');

const isStaff = (user) => isAdministrator(user) || isHR(user);

const isMember = (user) => isEmployee(user) || isIntern(user);

const getUserId = (user) =>
  user?.authUserId ||
  user?.user_id ||
  user?.id ||
  null;

const getProjectId = (project) => project?.id || project?.project_id || null;

const getProjectLeadId = (project) =>
  project?.leadId ||
  project?.lead_id ||
  project?.lead?.authUserId ||
  project?.lead?.user_id ||
  project?.lead?.id ||
  null;

const getMembershipUserId = (membership) =>
  membership?.userId ||
  membership?.user_id ||
  membership?.user?.authUserId ||
  membership?.user?.user_id ||
  membership?.user?.id ||
  null;

const getMembershipProjectId = (membership) =>
  membership?.projectId ||
  membership?.project_id ||
  membership?.project?.id ||
  null;

const isProjectMember = (user, project, memberships = []) => {
  const userId = getUserId(user);
  const projectId = getProjectId(project);

  if (!userId || !projectId) return false;

  if (getProjectLeadId(project) === userId) return true;

  return memberships.some(
    (membership) =>
      getMembershipUserId(membership) === userId &&
      getMembershipProjectId(membership) === projectId
  );
};

const canAccessUser = (currentUser, targetUser) => {
  if (!isActiveUser(currentUser) || !targetUser) return false;

  if (isAdministrator(currentUser)) return true;

  if (getUserId(currentUser) === getUserId(targetUser)) return true;

  return false;
};

const canViewUser = (currentUser, targetUser, options = {}) => {
  if (!isActiveUser(currentUser) || !targetUser) return false;

  if (isAdministrator(currentUser)) return true;

  if (getUserId(currentUser) === getUserId(targetUser)) return true;

  if (isHR(currentUser)) {
    return ['Employee', 'Intern'].includes(getRole(targetUser));
  }

  if (isMember(currentUser)) {
    return Boolean(options.isProjectMember);
  }

  return false;
};

const canCreateUser = (currentUser, targetRole) => {
  if (!isActiveUser(currentUser)) return false;

  const role = normalizeRole(targetRole);

  if (isAdministrator(currentUser)) {
    return ['HR', 'Employee', 'Intern'].includes(role);
  }

  if (isHR(currentUser)) {
    return ['Employee', 'Intern'].includes(role);
  }

  return false;
};

const canUpdateUser = (currentUser, targetUser) => {
  if (!isActiveUser(currentUser) || !targetUser) return false;

  if (isAdministrator(currentUser)) {
    return getRole(targetUser) !== 'Admin';
  }

  if (isHR(currentUser)) {
    return ['Employee', 'Intern'].includes(getRole(targetUser));
  }

  return false;
};

const canDeactivateUser = (currentUser, targetUser) => {
  if (!isActiveUser(currentUser) || !targetUser) return false;

  if (getUserId(currentUser) === getUserId(targetUser)) return false;

  if (isAdministrator(currentUser)) {
    return getRole(targetUser) !== 'Admin';
  }

  if (isHR(currentUser)) {
    return ['Employee', 'Intern'].includes(getRole(targetUser));
  }

  return false;
};

const canReactivateUser = (currentUser, targetUser) => {
  if (!isActiveUser(currentUser) || !targetUser) return false;

  if (isAdministrator(currentUser)) {
    return getRole(targetUser) !== 'Admin';
  }

  if (isHR(currentUser)) {
    return ['Employee', 'Intern'].includes(getRole(targetUser));
  }

  return false;
};

const canDeleteUser = () => false;

const canViewProject = (
  currentUser,
  project,
  memberships = []
) => {
  if (!isActiveUser(currentUser) || !project) return false;

  if (isAdministrator(currentUser)) return true;

  if (isHR(currentUser)) return true;

  return isProjectMember(currentUser, project, memberships);
};

const canCreateProject = (currentUser) =>
  isActiveUser(currentUser) && isStaff(currentUser);

const canUpdateProject = (currentUser, project) => {
  if (!isActiveUser(currentUser) || !project) return false;

  return isStaff(currentUser);
};

const canPublishProject = (currentUser, project) => {
  if (!isActiveUser(currentUser) || !project) return false;

  return isStaff(currentUser) && project.status === 'draft';
};

const canArchiveProject = (currentUser, project) => {
  if (!isActiveUser(currentUser) || !project) return false;

  return (
    isStaff(currentUser) &&
    project.status !== 'archived' &&
    project.status !== 'completed'
  );
};

const canRestoreProject = (currentUser, project) => {
  if (!isActiveUser(currentUser) || !project) return false;

  return isStaff(currentUser) && project.status === 'archived';
};

const canDeleteProject = () => false;

const canViewTimeline = (
  currentUser,
  project,
  timelineType = 'main',
  memberships = []
) => {
  if (!isActiveUser(currentUser) || !project) return false;

  if (isAdministrator(currentUser)) return true;

  if (isHR(currentUser)) return true;

  if (!isProjectMember(currentUser, project, memberships)) {
    return false;
  }

  return ['main', 'staff'].includes(timelineType);
};

const canPostToTimeline = (
  currentUser,
  project,
  timelineType = 'main',
  memberships = []
) => {
  if (!isActiveUser(currentUser) || !project) return false;

  if (isAdministrator(currentUser) || isHR(currentUser)) {
    return true;
  }

  if (!isProjectMember(currentUser, project, memberships)) {
    return false;
  }

  if (project.status === 'archived' || project.status === 'completed') {
    return false;
  }

  return timelineType === 'main' && isMember(currentUser);
};

const canReplyToTimeline = (
  currentUser,
  project,
  timelineType = 'main',
  memberships = []
) =>
  canPostToTimeline(currentUser, project, timelineType, memberships);

const canUploadAttachment = (
  currentUser,
  project,
  timelineType = 'main',
  memberships = []
) =>
  canPostToTimeline(currentUser, project, timelineType, memberships);

const canDeleteTimelineEntry = (
  currentUser,
  entry,
  project,
  memberships = []
) => {
  if (!isActiveUser(currentUser) || !entry || !project) return false;

  if (isAdministrator(currentUser)) return true;

  if (isHR(currentUser)) return true;

  if (!isProjectMember(currentUser, project, memberships)) {
    return false;
  }

  const entryUserId =
    entry.userId ||
    entry.user_id ||
    entry.user?.authUserId ||
    entry.user?.user_id ||
    entry.user?.id;

  return (
    isMember(currentUser) &&
    entryUserId === getUserId(currentUser) &&
    entry.timeline_id !== 'staff' &&
    entry.timelineType !== 'staff'
  );
};

const canManageProjectMembers = (currentUser, project) => {
  if (!isActiveUser(currentUser) || !project) return false;

  return isStaff(currentUser);
};

const canViewAdminDashboard = (user) =>
  isActiveUser(user) && isAdministrator(user);

const canViewHRDashboard = (user) =>
  isActiveUser(user) && (isAdministrator(user) || isHR(user));

const canViewMemberDashboard = (user) =>
  isActiveUser(user) && isMember(user);

const getDashboardPath = (user) => {
  if (!isActiveUser(user)) return '/login';

  if (isAdministrator(user)) return '/admin';

  if (isHR(user)) return '/hr';

  if (isEmployee(user)) return '/employee';

  if (isIntern(user)) return '/intern';

  return '/unauthorized';
};

const getRolePermissions = (role) =>
  ROLE_PERMISSIONS[normalizeRole(role)] || null;

const hasPermission = (user, resource, action) => {
  if (!isActiveUser(user)) return false;

  const role = getRole(user);
  const permissions = ROLE_PERMISSIONS[role];

  if (!permissions) return false;

  const resourcePermissions = permissions[resource];

  if (!resourcePermissions) return false;

  const permission = resourcePermissions[action];

  if (typeof permission === 'boolean') return permission;

  if (Array.isArray(permission)) {
    return permission.includes('all') || permission.includes(role);
  }

  return false;
};

export {
  ROLE_PERMISSIONS,
  normalizeRole,
  getRole,
  getUserId,
  getRolePermissions,
  hasRole,
  hasPermission,
  isActiveUser,
  isAdministrator,
  isHR,
  isEmployee,
  isIntern,
  isStaff,
  isMember,
  isProjectMember,
  canAccessUser,
  canViewUser,
  canCreateUser,
  canUpdateUser,
  canDeactivateUser,
  canReactivateUser,
  canDeleteUser,
  canViewProject,
  canCreateProject,
  canUpdateProject,
  canPublishProject,
  canArchiveProject,
  canRestoreProject,
  canDeleteProject,
  canViewTimeline,
  canPostToTimeline,
  canReplyToTimeline,
  canUploadAttachment,
  canDeleteTimelineEntry,
  canManageProjectMembers,
  canViewAdminDashboard,
  canViewHRDashboard,
  canViewMemberDashboard,
  getDashboardPath,
};

export default {
  ROLE_PERMISSIONS,
  normalizeRole,
  getRole,
  getUserId,
  getRolePermissions,
  hasRole,
  hasPermission,
  isActiveUser,
  isAdministrator,
  isHR,
  isEmployee,
  isIntern,
  isStaff,
  isMember,
  isProjectMember,
  canAccessUser,
  canViewUser,
  canCreateUser,
  canUpdateUser,
  canDeactivateUser,
  canReactivateUser,
  canDeleteUser,
  canViewProject,
  canCreateProject,
  canUpdateProject,
  canPublishProject,
  canArchiveProject,
  canRestoreProject,
  canDeleteProject,
  canViewTimeline,
  canPostToTimeline,
  canReplyToTimeline,
  canUploadAttachment,
  canDeleteTimelineEntry,
  canManageProjectMembers,
  canViewAdminDashboard,
  canViewHRDashboard,
  canViewMemberDashboard,
  getDashboardPath,
};