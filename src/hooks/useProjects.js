import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useNotifications } from './useNotifications';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  publishProject,
  getUserProjects,
} from '../services/projectService';

export default function useProjects(options = {}) {
  const { user } = useAuth();
  const { success, error } = useNotifications();

  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    autoFetch = true,
    status,
    category,
    userId,
  } = options;

  const fetchProjects = useCallback(
    async (filters = {}) => {
      setLoading(true);
      setErrorMessage('');

      try {
        const result = await getProjects({
          status: filters.status ?? status,
          category: filters.category ?? category,
          userId: filters.userId ?? userId,
        });

        const fetchedProjects = Array.isArray(result)
          ? result
          : result?.data || [];

        setProjects(fetchedProjects);
        return fetchedProjects;
      } catch (err) {
        const message = err.message || 'Failed to load projects.';
        setErrorMessage(message);
        error(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [status, category, userId, error]
  );

  const fetchProjectById = useCallback(
    async (projectId) => {
      if (!projectId) {
        setCurrentProject(null);
        return null;
      }

      setLoading(true);
      setErrorMessage('');

      try {
        const result = await getProjectById(projectId);
        const project = result?.data ?? result ?? null;

        setCurrentProject(project);
        return project;
      } catch (err) {
        const message = err.message || 'Failed to load project details.';
        setErrorMessage(message);
        error(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [error]
  );

  const fetchMyProjects = useCallback(async () => {
    if (!user?.id) {
      setProjects([]);
      return [];
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const result = await getUserProjects(user.id);
      const fetchedProjects = Array.isArray(result)
        ? result
        : result?.data || [];

      setProjects(fetchedProjects);
      return fetchedProjects;
    } catch (err) {
      const message = err.message || 'Failed to load your projects.';
      setErrorMessage(message);
      error(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id, error]);

  const addProject = useCallback(
    async (projectData) => {
      setActionLoading(true);
      setErrorMessage('');

      try {
        const result = await createProject({
          ...projectData,
          createdBy: user?.id,
        });

        const createdProject = result?.data ?? result;

        if (createdProject) {
          setProjects((previous) => [
            createdProject,
            ...previous.filter((project) => project.id !== createdProject.id),
          ]);
        }

        success('Project created successfully.');
        return { success: true, project: createdProject };
      } catch (err) {
        const message = err.message || 'Failed to create project.';
        setErrorMessage(message);
        error(message);
        return { success: false, error: message };
      } finally {
        setActionLoading(false);
      }
    },
    [user?.id, success, error]
  );

  const editProject = useCallback(
    async (projectId, updates) => {
      setActionLoading(true);
      setErrorMessage('');

      try {
        const result = await updateProject(projectId, updates);
        const updatedProject = result?.data ?? result;

        setProjects((previous) =>
          previous.map((project) =>
            project.id === projectId ? { ...project, ...updatedProject } : project
          )
        );

        setCurrentProject((previous) =>
          previous?.id === projectId
            ? { ...previous, ...updatedProject }
            : previous
        );

        success('Project updated successfully.');
        return { success: true, project: updatedProject };
      } catch (err) {
        const message = err.message || 'Failed to update project.';
        setErrorMessage(message);
        error(message);
        return { success: false, error: message };
      } finally {
        setActionLoading(false);
      }
    },
    [success, error]
  );

  const publish = useCallback(
    async (projectId) => {
      setActionLoading(true);
      setErrorMessage('');

      try {
        const result = await publishProject(projectId);
        const publishedProject = result?.data ?? result;

        setProjects((previous) =>
          previous.map((project) =>
            project.id === projectId
              ? { ...project, ...publishedProject, status: 'Published' }
              : project
          )
        );

        setCurrentProject((previous) =>
          previous?.id === projectId
            ? { ...previous, ...publishedProject, status: 'Published' }
            : previous
        );

        success('Project published successfully.');
        return { success: true, project: publishedProject };
      } catch (err) {
        const message = err.message || 'Failed to publish project.';
        setErrorMessage(message);
        error(message);
        return { success: false, error: message };
      } finally {
        setActionLoading(false);
      }
    },
    [success, error]
  );

  const refresh = useCallback(() => fetchProjects(), [fetchProjects]);

  useEffect(() => {
    if (!autoFetch) return;

    if (userId || user?.id) {
      fetchMyProjects();
    } else {
      fetchProjects();
    }
  }, [autoFetch, userId, user?.id, fetchMyProjects, fetchProjects]);

  return {
    projects,
    currentProject,
    loading,
    actionLoading,
    errorMessage,
    fetchProjects,
    fetchProjectById,
    fetchMyProjects,
    addProject,
    editProject,
    publish,
    refresh,
    setProjects,
    setCurrentProject,
    clearError: () => setErrorMessage(''),
  };
}