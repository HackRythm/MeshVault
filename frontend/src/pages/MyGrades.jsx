import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import projectService from '../services/projectService';
import { useAuth } from '../context/AuthContext';

export default function MyGrades() {
  const { user } = useAuth();
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        setLoading(true);
        const data = await projectService.getAllMyGrades();
        setGrades(data || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch your grades.');
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, []);

  // ─── Compute summary stats ───────────────────────────────────────────────────
  const totalGrades = grades.length;
  const avgScore = totalGrades > 0
    ? Math.round(grades.reduce((sum, g) => sum + (g.total_score / g.max_score) * 100, 0) / totalGrades)
    : 0;
  const bestScore = totalGrades > 0
    ? Math.round(Math.max(...grades.map(g => (g.total_score / g.max_score) * 100)))
    : 0;

  // ─── Group grades by workspace → project ──────────────────────────────────────
  const grouped = {};
  grades.forEach(g => {
    const wsKey = g.workspace_name || 'Unknown Workspace';
    if (!grouped[wsKey]) grouped[wsKey] = {};
    const projKey = g.project_name || g.project_project_id || 'Unknown Project';
    if (!grouped[wsKey][projKey]) {
      grouped[wsKey][projKey] = {
        project_id: g.project_project_id,
        workspace_id: g.workspace_id,
        group_name: g.group_name,
        grades: [],
      };
    }
    grouped[wsKey][projKey].grades.push(g);
  });

  const getScoreColor = (pct) => {
    if (pct >= 75) return 'var(--clr-success, #2ed573)';
    if (pct >= 50) return 'var(--clr-warning, #ffa502)';
    return 'var(--clr-error, #ff4757)';
  };

  const getGradeLetter = (pct) => {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
  };

  if (loading) {
    return (
      <AppLayout title="My Results">
        <LoadingSpinner message="Loading your results..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="My Results">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">🎓 My Results</h1>
          <p className="page-header__subtitle">
            Your released grades across all workspaces and projects
          </p>
        </div>
      </div>

      {error && <div className="login-card__error" style={{ marginBottom: '20px' }}>{error}</div>}

      {/* ─── Summary Stats ─── */}
      {totalGrades > 0 && (
        <div
          id="grades-summary"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            marginBottom: '32px',
          }}
        >
          <div
            className="card card--flat"
            style={{
              padding: '24px',
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.08) 0%, rgba(108, 92, 231, 0.02) 100%)',
              border: '1px solid rgba(108, 92, 231, 0.2)',
            }}
          >
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Total Evaluations
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--accent, #6c5ce7)' }}>
              {totalGrades}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              released grade{totalGrades !== 1 ? 's' : ''}
            </div>
          </div>

          <div
            className="card card--flat"
            style={{
              padding: '24px',
              textAlign: 'center',
              background: `linear-gradient(135deg, ${getScoreColor(avgScore)}11 0%, ${getScoreColor(avgScore)}05 100%)`,
              border: `1px solid ${getScoreColor(avgScore)}33`,
            }}
          >
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Average Score
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: getScoreColor(avgScore) }}>
              {avgScore}%
            </div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: getScoreColor(avgScore), marginTop: '4px' }}>
              Grade: {getGradeLetter(avgScore)}
            </div>
          </div>

          <div
            className="card card--flat"
            style={{
              padding: '24px',
              textAlign: 'center',
              background: `linear-gradient(135deg, ${getScoreColor(bestScore)}11 0%, ${getScoreColor(bestScore)}05 100%)`,
              border: `1px solid ${getScoreColor(bestScore)}33`,
            }}
          >
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Best Score
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: getScoreColor(bestScore) }}>
              {bestScore}%
            </div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: getScoreColor(bestScore), marginTop: '4px' }}>
              Grade: {getGradeLetter(bestScore)}
            </div>
          </div>
        </div>
      )}

      {/* ─── Grade Cards grouped by Workspace → Project ─── */}
      {totalGrades === 0 ? (
        <div
          className="card"
          style={{
            padding: '60px 40px',
            textAlign: 'center',
            borderStyle: 'dashed',
            background: 'rgba(255, 255, 255, 0.01)',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
            No Released Grades Yet
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto', lineHeight: '1.6' }}>
            Your faculty evaluators will release your grades once they've completed their review.
            Check back here after your projects have been evaluated.
          </p>
          <Link to="/projects" className="btn btn--secondary" style={{ marginTop: '24px', display: 'inline-flex' }}>
            📁 View My Projects
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {Object.entries(grouped).map(([wsName, projects]) => (
            <div key={wsName}>
              {/* Workspace header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '16px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: '18px' }}>📂</span>
                <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                  {wsName}
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingLeft: '8px' }}>
                {Object.entries(projects).map(([projName, projData]) => (
                  <div key={projName}>
                    {/* Project subheader */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px' }}>📁</span>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>
                          {projName}
                        </h3>
                        <span
                          className="badge badge--muted"
                          style={{ fontSize: '10px' }}
                        >
                          {projData.project_id}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Group: <strong>{projData.group_name}</strong>
                        </span>
                        <Link
                          to={`/projects/${projData.project_id}?workspace_id=${projData.workspace_id}`}
                          className="btn btn--ghost btn--sm"
                          style={{ fontSize: '11px', padding: '3px 10px' }}
                        >
                          View Project →
                        </Link>
                      </div>
                    </div>

                    {/* Grade cards for this project */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {projData.grades.map((g, idx) => {
                        const pct = Math.round((g.total_score / g.max_score) * 100);
                        const isLatest = idx === 0;
                        let crits = [];
                        try {
                          if (g.criterion_scores) {
                            crits = typeof g.criterion_scores === 'string'
                              ? JSON.parse(g.criterion_scores)
                              : g.criterion_scores;
                          }
                        } catch { /* ignore parse errors */ }

                        return (
                          <div
                            key={g.id}
                            id={`grade-card-${g.id}`}
                            className="card card--flat"
                            style={{
                              padding: '20px',
                              border: isLatest
                                ? `1px solid ${getScoreColor(pct)}44`
                                : '1px solid var(--border)',
                              background: isLatest
                                ? `linear-gradient(135deg, ${getScoreColor(pct)}08 0%, transparent 100%)`
                                : 'rgba(255, 255, 255, 0.005)',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = `0 4px 20px ${getScoreColor(pct)}15`;
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {/* Score circle */}
                                <div
                                  style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '50%',
                                    background: `conic-gradient(${getScoreColor(pct)} ${pct * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: '44px',
                                      height: '44px',
                                      borderRadius: '50%',
                                      background: 'var(--surface, #1a1a2e)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '14px',
                                      fontWeight: '700',
                                      color: getScoreColor(pct),
                                    }}
                                  >
                                    {pct}%
                                  </div>
                                </div>

                                <div>
                                  <div style={{ fontSize: '20px', fontWeight: '700', color: getScoreColor(pct) }}>
                                    {g.total_score} / {g.max_score}
                                  </div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    Grade: <strong style={{ color: getScoreColor(pct) }}>{getGradeLetter(pct)}</strong>
                                  </div>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                {isLatest && (
                                  <span
                                    className="badge badge--success"
                                    style={{ fontSize: '10px', marginBottom: '6px', display: 'inline-block' }}
                                  >
                                    Latest
                                  </span>
                                )}
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  Released: {g.released_at
                                    ? new Date(g.released_at).toLocaleDateString()
                                    : new Date(g.created_at).toLocaleDateString()}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  Evaluator: {g.evaluator_name}
                                </div>
                              </div>
                            </div>

                            {/* Criterion Breakdown */}
                            {crits && crits.length > 0 && (
                              <div
                                style={{
                                  background: 'rgba(0, 0, 0, 0.15)',
                                  padding: '12px 14px',
                                  borderRadius: 'var(--radius-sm, 8px)',
                                  marginBottom: '10px',
                                }}
                              >
                                <strong style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                                  Criterion Breakdown:
                                </strong>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
                                  {crits.map((c, cIdx) => {
                                    const critPct = c.max_marks > 0 ? Math.round((c.score / c.max_marks) * 100) : 0;
                                    return (
                                      <div key={cIdx} style={{ fontSize: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                          <span style={{ color: 'var(--text-muted)' }}>{c.name}</span>
                                          <strong style={{ color: getScoreColor(critPct) }}>
                                            {c.score}/{c.max_marks}
                                          </strong>
                                        </div>
                                        <div className="progress-bar" style={{ height: '3px' }}>
                                          <div
                                            className="progress-bar__fill"
                                            style={{
                                              width: `${critPct}%`,
                                              background: getScoreColor(critPct),
                                            }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Evaluator Notes */}
                            {g.notes && (
                              <div
                                style={{
                                  padding: '10px 14px',
                                  background: 'rgba(108, 92, 231, 0.05)',
                                  borderLeft: '3px solid var(--accent, #6c5ce7)',
                                  borderRadius: '0 var(--radius-sm, 8px) var(--radius-sm, 8px) 0',
                                  marginTop: '4px',
                                }}
                              >
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                  Evaluator Feedback
                                </div>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6', fontStyle: 'italic' }}>
                                  "{g.notes}"
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
