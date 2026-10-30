import { supabase } from '../lib/supabase';

const PROJECT_FIELDS = `
  id,
  name,
  category,
  description,
  status,
  lead_id,
  created_by,
  published_by,
  created_at,
  updated_at,
  published_at,
  completed_at
`;

const normalizeProject = (project) => {
  if (!project) return null;

  return {
    ...project,
    leadId: project.lead_id,
    createdBy: project.created_by,
    publishedBy: project.published_by,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    publishedAt: project.published_at,
    completedAt: project.completed_at,
  };
};

const normalizeMembership = (membership) => {
  if (!membership) return null;

  return {
    ...membership,
    projectId: membership.project_id,
    userId: membership.user_id,
    createdAt: membership.created_at,
  };
};

/**
 * Fetch projects with optional filters.
 */
export async function getProjects(options = {}) {
  const {
    status,
    category,
    search,
    limit,
    orderBy = 'created_at',
    ascending = false,
  } = options;

  let query = supabase
    .from('projects')
    .select(PROJECT_FIELDS)
    .order(orderBy, { ascending });

  if (status) {
    if (Array.isArray(status)) {
      query = query.in('status', status);
    } else {
      query = query.eq('status', status);
    }
  }

  if (category) {
    query = query.eq('category', category);
  }

  if (search?.trim()) {
    const searchTerm = search.trim().replace(/[%_,]/g, '');
    query = query.ilike('name', `%${searchTerm}%`);
  }

  if (Number.isInteger(limit) && limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch projects:', error);
    throw new Error('Unable to load projects.');
  }

  return (data || []).map(normalizeProject);
}

/**
 * Fetch a single project by its ID.
 */
export async function getProjectById(projectId) {
  if (!projectId) {
    throw new Error('A project ID is required.');
  }

  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_FIELDS)
    .eq('id', projectId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch project:', error);
    throw new Error('Unable to load project details.');
  }

  return normalizeProject(data);
}

/**
 * Create a new project in draft status.
 */
export async function createProject(projectData) {
  const {
    name,
    category,
    description = '',
    leadId,
    lead_id,
    createdBy,
    created_by,
    memberIds = [],
    members = [],
  } = projectData || {};

  const projectName = name?.trim();
  const resolvedLeadId = leadId || lead_id;
  const resolvedCreatedBy = createdBy || created_by;

  if (!projectName) {
    throw new Error('Project name is required.');
  }

  if (!['Intern-Based', 'Main Project'].includes(category)) {
    throw new Error('Please select a valid project category.');
  }

  if (!resolvedLeadId) {
    throw new Error('A project lead is required.');
  }

  if (!resolvedCreatedBy) {
    throw new Error('The project creator could not be identified.');
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name: projectName,
      category,
      description: description.trim(),
      lead_id: resolvedLeadId,
      created_by: resolvedCreatedBy,
      status: 'Draft',
    })
    .select(PROJECT_FIELDS)
    .single();

  if (projectError) {
    console.error('Failed to create project:', projectError);
    throw new Error('Unable to create project.');
  }

  const selectedMembers = [
    ...new Set(
      [...memberIds, ...members.map((member) =>
        typeof member === 'string' ? member : member?.userId || member?.user_id
      )].filter(Boolean)
    ),
  ].filter((userId) => userId !== resolvedLeadId);

  const memberships = [
    {
      project_id: project.id,
      user_id: resolvedLeadId,
      role: 'Lead',
    },
    ...selectedMembers.map((userId) => ({
      project_id: project.id,
      user_id: userId,
      role: 'Member',
    })),
  ];

  const { error: membershipError } = await supabase
    .from('project_members')
    .insert(memberships);

  // The client can't wrap both inserts in one transaction, so roll back by
  // hand: delete the new project if its team can't be assigned, rather than
  // leaving a project with no members.
  if (membershipError) {
    console.error('Failed to assign project members:', membershipError);

    await supabase.from('projects').delete().eq('id', project.id);

    throw new Error(
      'The project could not be assigned to its team. Please try again.'
    );
  }

  return normalizeProject(project);
}

/**
 * Update editable project details.
 */
export async function updateProject(projectId, updates) {
  if (!projectId) {
    throw new Error('A project ID is required.');
  }

  const allowedFields = [
    'name',
    'category',
    'description',
    'lead_id',
    'leadId',
  ];

  const payload = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(updates || {}, field)) {
      const databaseField = field === 'leadId' ? 'lead_id' : field;
      const value = updates[field];

      payload[databaseField] =
        typeof value === 'string' && field !== 'category'
          ? value.trim()
          : value;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'name') && !payload.name) {
    throw new Error('Project name cannot be empty.');
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, 'category') &&
    !['Intern-Based', 'Main Project'].includes(payload.category)
  ) {
    throw new Error('Please select a valid project category.');
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('No valid project changes were provided.');
  }

  const { data, error } = await supabase
    .from('projects')
    .update(payload)
    .eq('id', projectId)
    .select(PROJECT_FIELDS)
    .single();

  if (error) {
    console.error('Failed to update project:', error);
    throw new Error('Unable to update project.');
  }

  return normalizeProject(data);
}

/**
 * Publish a draft project.
 */
export async function publishProject(projectId, publishedBy) {
  if (!projectId) {
    throw new Error('A project ID is required.');
  }

  const payload = {
    status: 'Published',
    published_at: new Date().toISOString(),
  };

  if (publishedBy) {
    payload.published_by = publishedBy;
  }

  const { data, error } = await supabase
    .from('projects')
    .update(payload)
    .eq('id', projectId)
    .eq('status', 'draft')
    .select(PROJECT_FIELDS)
    .maybeSingle();

  if (error) {
    console.error('Failed to publish project:', error);
    throw new Error('Unable to publish project.');
  }

  if (!data) {
    throw new Error(
      'The project could not be published. It may already be published or you may not have permission.'
    );
  }

  return normalizeProject(data);
}

/**
 * Change a project's status.
 */
export async function updateProjectStatus(projectId, status) {
  const allowedStatuses = [
    'draft',
    'published',
    'active',
    'in_progress',
    'completed',
    'archived',
  ];

  if (!projectId) {
    throw new Error('A project ID is required.');
  }

  if (!allowedStatuses.includes(status)) {
    throw new Error('Invalid project status.');
  }

  const payload = { status };

  if (status === 'completed') {
    payload.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('projects')
    .update(payload)
    .eq('id', projectId)
    .select(PROJECT_FIELDS)
    .single();

  if (error) {
    console.error('Failed to update project status:', error);
    throw new Error('Unable to update project status.');
  }

  return normalizeProject(data);
}

/**
 * Fetch projects associated with a user through membership or project leadership.
 */
export async function getUserProjects(userId, options = {}) {
  if (!userId) {
    throw new Error('A user ID is required.');
  }

  const { includeArchived = true, status, category } = options;

  const [membershipResult, leadResult] = await Promise.all([
    supabase
      .from('project_members')
      .select('project_id, user_id, role, created_at')
      .eq('user_id', userId),

    supabase
      .from('projects')
      .select(PROJECT_FIELDS)
      .eq('lead_id', userId),
  ]);

  if (membershipResult.error) {
    console.error('Failed to fetch project memberships:', membershipResult.error);
    throw new Error('Unable to load project memberships.');
  }

  if (leadResult.error) {
    console.error('Failed to fetch led projects:', leadResult.error);
    throw new Error('Unable to load projects.');
  }

  const projectIds = [
    ...new Set([
      ...(membershipResult.data || []).map((membership) => membership.project_id),
      ...(leadResult.data || []).map((project) => project.id),
    ]),
  ];

  if (projectIds.length === 0) return [];

  let query = supabase
    .from('projects')
    .select(PROJECT_FIELDS)
    .in('id', projectIds)
    .order('created_at', { ascending: false });

  if (!includeArchived) {
    query = query.neq('status', 'archived');
  }

  if (status) {
    if (Array.isArray(status)) {
      query = query.in('status', status);
    } else {
      query = query.eq('status', status);
    }
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch user projects:', error);
    throw new Error('Unable to load your projects.');
  }

  const memberships = (membershipResult.data || []).map(normalizeMembership);
  const membershipByProject = new Map(
    memberships.map((membership) => [membership.projectId, membership])
  );

  return (data || []).map((project) => ({
    ...normalizeProject(project),
    membership: membershipByProject.get(project.id) || null,
    isLead: project.lead_id === userId,
  }));
}

/**
 * Fetch members assigned to a project.
 */
export async function getProjectMembers(projectId) {
  if (!projectId) {
    throw new Error('A project ID is required.');
  }

  const { data, error } = await supabase
    .from('project_members')
    .select(`
      project_id,
      user_id,
      role,
      created_at,
      profiles (
        id,
        user_id,
        user_code,
        name,
        email,
        role,
        department,
        is_active
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch project members:', error);
    throw new Error('Unable to load project team members.');
  }

  return (data || []).map((membership) => ({
    ...normalizeMembership(membership),
    user: membership.profiles
      ? {
          ...membership.profiles,
          userId: membership.profiles.user_code || membership.profiles.user_id,
          isActive: membership.profiles.is_active !== false,
        }
      : null,
  }));
}

/**
 * Replace the assigned project team.
 */
export async function updateProjectMembers(projectId, leadId, memberIds = []) {
  if (!projectId || !leadId) {
    throw new Error('A project ID and lead ID are required.');
  }

  const uniqueMemberIds = [
    ...new Set(memberIds.filter(Boolean)),
  ].filter((userId) => userId !== leadId);

  const memberships = [
    {
      project_id: projectId,
      user_id: leadId,
      role: 'Lead',
    },
    ...uniqueMemberIds.map((userId) => ({
      project_id: projectId,
      user_id: userId,
      role: 'Member',
    })),
  ];

  // Replace the team by deleting every assignment and re-inserting the new
  // list. These are two separate requests, not one transaction: if the
  // insert fails, the project is left with no members until it is saved again.
  const { error: deleteError } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId);

  if (deleteError) {
    console.error('Failed to clear existing project members:', deleteError);
    throw new Error('Unable to update the project team.');
  }

  const { data, error } = await supabase
    .from('project_members')
    .insert(memberships)
    .select('project_id, user_id, role, created_at');

  if (error) {
    console.error('Failed to assign new project members:', error);
    throw new Error('Unable to assign the new project team.');
  }

  return (data || []).map(normalizeMembership);
}