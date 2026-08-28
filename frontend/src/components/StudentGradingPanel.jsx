import React, { useState, useEffect } from 'react';
import projectService from '../services/projectService';
import workspaceService from '../services/workspaceService';

export default function StudentGradingPanel({ workspaceId, projectId, groupName, members = [] }) {
  const [gradingScheme, setGradingScheme] = useState(null);
  const [studentGrades, setStudentGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Local form inputs per student: { [studentId]: { criterionScores: { [critId]: number }, totalScore: string, notes: string } }
  const [formState, setFormState] = useState({});
  const [savingStudentId, setSavingStudentId] = useState(null);
  const [releasingGradeId, setReleasingGradeId] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState({});

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    loadGradingData();
  }, [workspaceId, projectId]);

  const loadGradingData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Load workspace grading scheme
      const scheme = await workspaceService.getGradingScheme(workspaceId);
      setGradingScheme(scheme);

      // 2. Load all student grades for this project
      const grades = await projectService.getStudentGrades(workspaceId, projectId);
      setStudentGrades(grades || []);

      // 3. Initialize default form state for each student member
      const initialForm = {};
      members.forEach((m) => {
        const critScores = {};
        if (scheme && scheme.criteria && scheme.criteria.length > 0) {
          scheme.criteria.forEach((c) => {
            critScores[c.id] = '';
          });
        }
        initialForm[m.id] = {
          criterionScores: critScores,
          totalScore: '',
          notes: '',
        };
      });
      setFormState(initialForm);
    } catch (err) {
      setError(err.message || 'Failed to load grading details.');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (studentId, critId, value) => {
    setFormState((prev) => {
      const studentState = prev[studentId] || { criterionScores: {}, totalScore: '', notes: '' };
      const updatedCrits = { ...studentState.criterionScores, [critId]: value };
      
      // Auto-calculate total score if criteria exist
      let autoTotal = 0;
      let hasValue = false;
      if (gradingScheme?.criteria?.length > 0) {
        gradingScheme.criteria.forEach((c) => {
          const val = parseFloat(updatedCrits[c.id]);
          if (!isNaN(val)) {
            autoTotal += val;
            hasValue = true;
          }
        });
      }

      return {
        ...prev,
        [studentId]: {
          ...studentState,
          criterionScores: updatedCrits,
          totalScore: hasValue ? autoTotal.toString() : studentState.totalScore,
        },
      };
    });
  };

  const handleDirectTotalChange = (studentId, value) => {
    setFormState((prev) => {
      const studentState = prev[studentId] || { criterionScores: {}, totalScore: '', notes: '' };
      return {
        ...prev,
        [studentId]: {
          ...studentState,
          totalScore: value,
        },
      };
    });
  };

  const handleNotesChange = (studentId, value) => {
    setFormState((prev) => {
      const studentState = prev[studentId] || { criterionScores: {}, totalScore: '', notes: '' };
      return {
        ...prev,
        [studentId]: {
          ...studentState,
          notes: value,
        },
      };
    });
  };

  const handleSaveStudentGrade = async (student) => {
    setError('');
    setSuccess('');
    const state = formState[student.id];
    if (!state) return;

    const total = parseFloat(state.totalScore);
    if (isNaN(total) || total < 0) {
      setError(`Please enter a valid total score for ${student.name}`);
      return;
    }

    let maxMarks = 100;
    const criterionScoresPayload = [];
    if (gradingScheme?.criteria?.length > 0) {
      let maxCalc = 0;
      for (const c of gradingScheme.criteria) {
        maxCalc += c.max_marks;
        const val = parseFloat(state.criterionScores[c.id] || 0);
        criterionScoresPayload.push({
          criterion_id: c.id,
          name: c.name,
          score: isNaN(val) ? 0 : val,
          max_marks: c.max_marks,
        });
      }
      if (maxCalc > 0) maxMarks = maxCalc;
    }

    setSavingStudentId(student.id);
    try {
      await projectService.submitStudentGrade(workspaceId, projectId, {
        student_id: student.id,
        total_score: total,
        max_score: maxMarks,
        notes: state.notes || '',
        criterion_scores: criterionScoresPayload.length > 0 ? criterionScoresPayload : null,
      });

      setSuccess(`Grade saved (append-only) for ${student.name}. Defaulted to UNRELEASED.`);
      
      // Reload grades to show new record in history
      const updatedGrades = await projectService.getStudentGrades(workspaceId, projectId);
      setStudentGrades(updatedGrades || []);

      // Reset total score & notes for that student
      setFormState((prev) => ({
        ...prev,
        [student.id]: {
          criterionScores: prev[student.id]?.criterionScores || {},
          totalScore: '',
          notes: '',
        },
      }));
    } catch (err) {
      setError(err.message || `Failed to save grade for ${student.name}`);
    } finally {
      setSavingStudentId(null);
    }
  };

  const handleReleaseGrade = async (gradeId, studentName) => {
    setError('');
    setSuccess('');
    setReleasingGradeId(gradeId);
    try {
      await projectService.releaseStudentGrade(workspaceId, projectId, gradeId);
      setSuccess(`Grade released for ${studentName}! Student can now view it.`);
      const updatedGrades = await projectService.getStudentGrades(workspaceId, projectId);
      setStudentGrades(updatedGrades || []);
    } catch (err) {
      setError(err.message || 'Failed to release grade.');
    } finally {
      setReleasingGradeId(null);
    }
  };

  const toggleHistory = (studentId) => {
    setExpandedHistory((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  if (loading) {
    return <div style={{ padding: '16px', color: 'var(--text-muted)' }}>Loading student grading panel...</div>;
  }

  const hasCriteria = gradingScheme?.criteria?.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: '600' }}>🎓 Individual Student Grading</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Group: <strong>{groupName}</strong> • Project: <strong>{projectId}</strong>
          </p>
        </div>
        {hasCriteria && (
          <span style={{ fontSize: '11px', background: 'rgba(108, 92, 231, 0.1)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '12px' }}>
            Using Workspace Criteria ({gradingScheme.criteria.length})
          </span>
        )}
      </div>

      {error && <div className="login-card__error" style={{ fontSize: '13px', margin: 0 }}>{error}</div>}
      {success && (
        <div style={{ padding: '10px 14px', background: 'rgba(46, 213, 115, 0.1)', border: '1px solid rgba(46, 213, 115, 0.3)', color: '#2ed573', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
          {success}
        </div>
      )}

      {members.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No student members found in this group.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {members.map((student) => {
            const studentHistory = studentGrades.filter((g) => g.student_id === student.id);
            const latestGrade = studentHistory[0]; // ordered newest first
            const currentState = formState[student.id] || { criterionScores: {}, totalScore: '', notes: '' };

            return (
              <div
                key={student.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                }}
              >
                {/* Student Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{student.name}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                      ({student.user_id}) {student.is_leader ? '👑 Leader' : ''}
                    </span>
                  </div>

                  {latestGrade && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent)' }}>
                        Latest: {latestGrade.total_score} / {latestGrade.max_score}
                      </span>
                      <span
                        className={`badge ${latestGrade.is_released ? 'badge--success' : 'badge--warning'}`}
                        style={{ fontSize: '10px' }}
                      >
                        {latestGrade.is_released ? 'RELEASED' : 'UNRELEASED'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Grading Form Inputs */}
                <div style={{ background: 'rgba(0, 0, 0, 0.15)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}>
                  {hasCriteria ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                      {gradingScheme.criteria.map((crit) => (
                        <div key={crit.id}>
                          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            {crit.name} (max {crit.max_marks})
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            className="form-input"
                            style={{ padding: '6px 8px', fontSize: '12.5px' }}
                            placeholder={`0 - ${crit.max_marks}`}
                            value={currentState.criterionScores[crit.id] || ''}
                            onChange={(e) => handleScoreChange(student.id, crit.id, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: '120px' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Total Score {hasCriteria ? '(Auto)' : '(out of 100)'}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        className="form-input"
                        style={{ padding: '6px 8px', fontSize: '12.5px' }}
                        placeholder="Total Score"
                        value={currentState.totalScore}
                        onChange={(e) => handleDirectTotalChange(student.id, e.target.value)}
                      />
                    </div>

                    <div style={{ flex: '1', minWidth: '200px' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Evaluator Notes / Feedback
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '6px 8px', fontSize: '12.5px' }}
                        placeholder="Add specific comments for this student..."
                        value={currentState.notes}
                        onChange={(e) => handleNotesChange(student.id, e.target.value)}
                      />
                    </div>

                    <div style={{ marginTop: '19px' }}>
                      <button
                        type="button"
                        className="btn btn--primary"
                        style={{ padding: '6px 14px', fontSize: '12px' }}
                        disabled={savingStudentId === student.id}
                        onClick={() => handleSaveStudentGrade(student)}
                      >
                        {savingStudentId === student.id ? 'Saving...' : '💾 Save Grade'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Latest Unreleased Grade Action (Release Toggle) */}
                {latestGrade && !latestGrade.is_released && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 177, 61, 0.08)', border: '1px dashed rgba(255, 177, 61, 0.3)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Unreleased Grade Pending ({latestGrade.total_score}/{latestGrade.max_score})
                    </span>
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: '4px 12px', fontSize: '11.5px', background: 'var(--clr-success)', color: '#fff', border: 'none' }}
                      disabled={releasingGradeId === latestGrade.id}
                      onClick={() => handleReleaseGrade(latestGrade.id, student.name)}
                    >
                      {releasingGradeId === latestGrade.id ? 'Releasing...' : '🔓 Release Grade to Student'}
                    </button>
                  </div>
                )}

                {/* History Accordion */}
                {studentHistory.length > 0 && (
                  <div>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '11.5px', cursor: 'pointer', padding: 0, marginTop: '4px' }}
                      onClick={() => toggleHistory(student.id)}
                    >
                      {expandedHistory[student.id] ? '▼ Hide Grading History' : `▶ View Grading History (${studentHistory.length} evaluation${studentHistory.length > 1 ? 's' : ''})`}
                    </button>

                    {expandedHistory[student.id] && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                        {studentHistory.map((g) => (
                          <div
                            key={g.id}
                            style={{
                              padding: '8px 12px',
                              background: 'rgba(0, 0, 0, 0.2)',
                              borderLeft: g.is_released ? '3px solid #2ed573' : '3px solid #ffa502',
                              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                              fontSize: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                              <span>
                                <strong>{g.total_score} / {g.max_score}</strong> • Evaluated by {g.evaluator_name}
                              </span>
                              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                {new Date(g.created_at).toLocaleString()}
                              </span>
                            </div>
                            {g.notes && <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '2px 0' }}>"{g.notes}"</p>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                              <span className={`badge ${g.is_released ? 'badge--success' : 'badge--warning'}`} style={{ fontSize: '9.5px' }}>
                                {g.is_released ? `Released on ${new Date(g.released_at).toLocaleDateString()}` : 'Unreleased'}
                              </span>
                              {!g.is_released && (
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', color: '#2ed573', textDecoration: 'underline', fontSize: '11px', cursor: 'pointer' }}
                                  onClick={() => handleReleaseGrade(g.id, student.name)}
                                >
                                  Release now
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
