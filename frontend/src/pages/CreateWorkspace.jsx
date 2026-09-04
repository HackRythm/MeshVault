import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import workspaceService from '../services/workspaceService';
import { useAuth } from '../context/AuthContext';

export default function CreateWorkspace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [workspaceId, setWorkspaceId] = useState('');
  const [name, setName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [description, setDescription] = useState('');
  
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workspaceId.trim() || !name || !courseCode || !courseName || !academicYear) {
      setError('Please fill in all required fields, including the unique Workspace Code / ID.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const data = {
        workspace_id: workspaceId.trim(),
        name: name.trim(),
        course_code: courseCode.trim(),
        course_name: courseName.trim(),
        academic_year: academicYear.trim(),
        description: description.trim() || null,
      };

      await workspaceService.createWorkspace(user.id, data);
      navigate('/workspace');
    } catch (err) {
      setError(err.message || 'Failed to create workspace.');
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== 'STAFF') {
    return (
      <AppLayout title="Access Denied">
        <div className="card p-24 text-center" style={{ maxWidth: '580px', margin: '40px auto', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>Staff Access Only</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            Only <strong>Faculty/Staff</strong> accounts can create academic workspaces.<br />
            Students can join workspaces created by instructors using the <strong>Workspace Code / ID</strong>.
          </p>
          <Link to="/workspace" className="btn btn--primary">
            ← Back to Workspaces
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="New Workspace">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Create Academic Workspace</h1>
          <p className="page-header__subtitle">Establish a new course lab environment by entering your unique Workspace Code.</p>
        </div>
        <Link to="/workspace" className="btn btn--secondary">Cancel</Link>
      </div>

      {error && <div className="login-card__error mb-24">{error}</div>}

      <div className="card" style={{ maxWidth: '720px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Unique Workspace Code / ID *</label>
            <input 
              type="text" 
              className="form-input" 
              value={workspaceId} 
              onChange={(e) => setWorkspaceId(e.target.value)} 
              placeholder="e.g. WS-ADSA-204 or 23AID204 or CS201-LAB"
              required 
              autoFocus
            />
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Enter a unique ID for your workspace. Students and project groups will use this code to join your workspace.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Workspace Name *</label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
              placeholder="e.g. DSA Lecture Hall Workspace" 
            />
          </div>


          <div className="grid grid--2" style={{ gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Course Code *</label>
              <input 
                type="text" 
                className="form-input" 
                value={courseCode} 
                onChange={(e) => setCourseCode(e.target.value)} 
                required 
                placeholder="e.g. CS201" 
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Academic Year *</label>
              <input 
                type="text" 
                className="form-input" 
                value={academicYear} 
                onChange={(e) => setAcademicYear(e.target.value)} 
                required 
                placeholder="e.g. 2025-2026" 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Course Name *</label>
            <input 
              type="text" 
              className="form-input" 
              value={courseName} 
              onChange={(e) => setCourseName(e.target.value)} 
              required 
              placeholder="e.g. Data Structures & Algorithms" 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea 
              className="form-textarea" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              style={{ minHeight: '100px' }} 
              placeholder="Workspace details, guidelines, and context..."
            />
          </div>

          <div className="flex gap-16" style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Creating workspace...' : '✓ Create Workspace'}
            </button>
            <Link to="/workspace" className="btn btn--secondary">Cancel</Link>
          </div>

        </form>
      </div>
    </AppLayout>
  );
}
