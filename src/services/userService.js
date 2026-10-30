import { supabase } from '../lib/supabase';

const PROFILE_FIELDS = `
  id,
  user_id,
  user_code,
  name,
  email,
  role,
  department,
  is_active,
  created_at,
  updated_at
`;

const VALID_ROLES = ['Admin', 'HR', 'Employee', 'Intern'];

// ID naming used across the app:
//   id        - profile primary key (same UUID as auth.users.id)
//   user_code - human-readable company ID used to sign in, e.g. "EMP0003"
// `userId` on the normalised object is the company ID when one exists,
// not a UUID.
const normalizeUser = (profile) => {
  if (!profile) return null;

  return {
    ...profile,
    authUserId: profile.user_id,
    userId: profile.user_code || profile.user_id,
    isActive: profile.is_active !== false,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
};

const normalizeRole = (role) => {
  if (!role) return role;

  const roles = {
    admin: 'Admin',
    hr: 'HR',
    employee: 'Employee',
    intern: 'Intern',
  };

  return roles[role.toLowerCase()] || role;
};

/**
 * Fetch users with optional role, status, and search filters.
 */
export async function getUsers(options = {}) {
  const {
    role,
    roles,
    isActive,
    search,
    department,
    limit,
    orderBy = 'created_at',
    ascending = false,
  } = options;

  let query = supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .order(orderBy, { ascending });

  const normalizedRoles = roles
    ? roles.map(normalizeRole)
    : role
      ? [normalizeRole(role)]
      : null;

  if (normalizedRoles?.length) {
    query = query.in('role', normalizedRoles);
  }

  if (typeof isActive === 'boolean') {
    query = query.eq('is_active', isActive);
  }

  if (department) {
    query = query.eq('department', department);
  }

  if (search?.trim()) {
    // Strip characters that have special meaning in ILIKE patterns (% _) or
    // that would split the PostgREST `or` filter (,).
    const searchTerm = search.trim().replace(/[%_,]/g, '');

    query = query.or(
      `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,user_code.ilike.%${searchTerm}%`
    );
  }

  if (Number.isInteger(limit) && limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch users:', error);
    throw new Error('Unable to load users.');
  }

  return (data || []).map(normalizeUser);
}

/**
 * Fetch one user profile by profile UUID, Auth UUID, or company user code.
 */
export async function getUserById(identifier) {
  if (!identifier) {
    throw new Error('A user identifier is required.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .or(
      `id.eq.${identifier},user_id.eq.${identifier},user_code.eq.${identifier}`
    )
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Unable to load user details.');
  }

  return normalizeUser(data);
}

/**
 * Fetch a user by company ID.
 */
export async function getUserByUserId(userId) {
  if (!userId?.trim()) {
    throw new Error('A company user ID is required.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('user_code', userId.trim().toUpperCase())
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch user by company ID:', error);
    throw new Error('Unable to find this user.');
  }

  return normalizeUser(data);
}

/**
 * Create a user through a trusted Supabase Edge Function.
 * Never create Auth users or store passwords directly from the browser.
 */
export async function createUser(userData) {
  const { name, email, role, department = '', password } = userData || {};

  const normalizedName = name?.trim();
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedRole = normalizeRole(role);

  if (!normalizedName || !normalizedEmail || !normalizedRole) {
    throw new Error('Name, email, and role are required.');
  }

  if (!VALID_ROLES.includes(normalizedRole)) {
    throw new Error('Please select a valid user role.');
  }

  const { data: authData } = await supabase.auth.getSession();

  if (!authData.session) {
    throw new Error('You must be signed in to create a user.');
  }

  const payload = {
    name: normalizedName,
    email: normalizedEmail,
    role: normalizedRole,
    department: department.trim(),
  };

  if (password?.trim()) {
    payload.password = password;
  }

  const { data, error } = await supabase.functions.invoke('create-user', {
    body: payload,
  });

  if (error) {
    console.error('Failed to create user:', error);
    throw new Error(
      error.message || 'Unable to create the user. Please try again.'
    );
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  const createdUser = data?.user || data?.profile || data;

  if (!createdUser) {
    throw new Error('The user creation service returned no user details.');
  }

  return normalizeUser(createdUser);
}

/**
 * Update editable profile information.
 */
export async function updateUser(userId, updates) {
  if (!userId) {
    throw new Error('A user identifier is required.');
  }

  const payload = {};
  const fields = ['name', 'email', 'role', 'department'];

  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(updates || {}, field)) {
      continue;
    }

    const value = updates[field];

    if (field === 'role') {
      const normalizedRole = normalizeRole(value);

      if (!VALID_ROLES.includes(normalizedRole)) {
        throw new Error('Please select a valid user role.');
      }

      payload.role = normalizedRole;
    } else if (field === 'email') {
      const email = value?.trim().toLowerCase();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Please enter a valid email address.');
      }

      payload.email = email;
    } else if (field === 'name') {
      const name = value?.trim();

      if (!name) {
        throw new Error('Name cannot be empty.');
      }

      payload.name = name;
    } else {
      payload.department = value?.trim() || '';
    }
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('No valid profile changes were provided.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select(PROFILE_FIELDS)
    .maybeSingle();

  if (error) {
    console.error('Failed to update user:', error);
    throw new Error('Unable to update user details.');
  }

  if (!data) {
    throw new Error('User not found or you do not have permission to update them.');
  }

  return normalizeUser(data);
}

/**
 * Activate or deactivate a user without deleting their history.
 */
export async function setUserActiveStatus(userId, isActive, reason = '') {
  if (!userId) {
    throw new Error('A user identifier is required.');
  }

  if (typeof isActive !== 'boolean') {
    throw new Error('A valid account status is required.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select(PROFILE_FIELDS)
    .maybeSingle();

  if (error) {
    console.error('Failed to update account status:', error);
    throw new Error(
      `Unable to ${isActive ? 'activate' : 'deactivate'} this account.`
    );
  }

  if (!data) {
    throw new Error('User not found or you do not have permission to update them.');
  }

  return {
    ...normalizeUser(data),
    statusChangeReason: reason.trim() || null,
  };
}

/**
 * Deactivate a user.
 */
export async function deactivateUser(userId, reason = '') {
  return setUserActiveStatus(userId, false, reason);
}

/**
 * Reactivate a user.
 */
export async function reactivateUser(userId) {
  return setUserActiveStatus(userId, true);
}

/**
 * Fetch users filtered by role.
 */
export async function getUsersByRole(role, options = {}) {
  if (!VALID_ROLES.includes(normalizeRole(role))) {
    throw new Error('Please provide a valid user role.');
  }

  return getUsers({
    ...options,
    role: normalizeRole(role),
  });
}

/**
 * Fetch active employees and interns eligible for project assignment.
 */
export async function getProjectEligibleUsers() {
  return getUsers({
    roles: ['Employee', 'Intern'],
    isActive: true,
    orderBy: 'name',
    ascending: true,
  });
}

/**
 * Fetch a user's project memberships.
 */
export async function getUserProjectMemberships(userId) {
  if (!userId) {
    throw new Error('A user identifier is required.');
  }

  const { data, error } = await supabase
    .from('project_members')
    .select(`
      project_id,
      user_id,
      role,
      created_at,
      projects (
        id,
        name,
        category,
        description,
        status,
        lead_id,
        created_at,
        published_at,
        completed_at
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch user project memberships:', error);
    throw new Error('Unable to load the user project history.');
  }

  return (data || []).map((membership) => ({
    ...membership,
    projectId: membership.project_id,
    userId: membership.user_id,
    createdAt: membership.created_at,
    project: membership.projects
      ? {
          ...membership.projects,
          leadId: membership.projects.lead_id,
          createdAt: membership.projects.created_at,
          publishedAt: membership.projects.published_at,
          completedAt: membership.projects.completed_at,
        }
      : null,
  }));
}

/**
 * Permanently delete a profile.
 *
 * Account deletion is intentionally disabled because project history,
 * timelines, and audit records must be preserved.
 */
export async function deleteUser() {
  throw new Error(
    'Permanent user deletion is disabled. Deactivate the account to preserve project history.'
  );
}