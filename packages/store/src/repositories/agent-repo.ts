import type { AgentRunSession, AgentStepLog } from '@seo-partner/core';
import type { SeoDatabase } from '../db.js';

export class AgentRepository {
  public constructor(private readonly store: SeoDatabase) {}

  public createSession(session: AgentRunSession): AgentRunSession {
    this.store.db
      .prepare(`
        INSERT INTO agent_run_session (
          id, project_id, goal, model_name, provider,
          max_iterations, iterations_completed, status,
          started_at, completed_at, patches_generated, patches_applied
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        session.id,
        session.projectId,
        session.goal,
        session.modelName,
        session.provider,
        session.maxIterations,
        session.iterationsCompleted,
        session.status,
        session.startedAt,
        session.completedAt,
        session.patchesGenerated,
        session.patchesApplied,
      );

    return session;
  }

  public updateSession(session: Partial<AgentRunSession> & { id: string }): void {
    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    if (session.iterationsCompleted !== undefined) {
      fields.push('iterations_completed = ?');
      values.push(session.iterationsCompleted);
    }
    if (session.status !== undefined) {
      fields.push('status = ?');
      values.push(session.status);
    }
    if (session.completedAt !== undefined) {
      fields.push('completed_at = ?');
      values.push(session.completedAt);
    }
    if (session.patchesGenerated !== undefined) {
      fields.push('patches_generated = ?');
      values.push(session.patchesGenerated);
    }
    if (session.patchesApplied !== undefined) {
      fields.push('patches_applied = ?');
      values.push(session.patchesApplied);
    }

    if (fields.length === 0) return;

    values.push(session.id);
    this.store.db
      .prepare(`UPDATE agent_run_session SET ${fields.join(', ')} WHERE id = ?`)
      .run(...values);
  }

  public getSession(id: string): AgentRunSession | null {
    const row = this.store.db
      .prepare('SELECT * FROM agent_run_session WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;

    return row ? this.mapSessionRow(row) : null;
  }

  public listSessions(projectId: string, limit = 20): ReadonlyArray<AgentRunSession> {
    const rows = this.store.db
      .prepare(`
        SELECT * FROM agent_run_session
        WHERE project_id = ?
        ORDER BY started_at DESC
        LIMIT ?
      `)
      .all(projectId, limit) as Array<Record<string, unknown>>;

    return rows.map(this.mapSessionRow);
  }

  public addStepLog(step: AgentStepLog): void {
    this.store.db
      .prepare(`
        INSERT INTO agent_step_log (
          id, session_id, step_index, thought,
          tool_name, tool_arguments, tool_result, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        step.id,
        step.sessionId,
        step.stepIndex,
        step.thought,
        step.toolName,
        JSON.stringify(step.toolArguments),
        JSON.stringify(step.toolResult),
        step.createdAt,
      );
  }

  public getStepLogs(sessionId: string): ReadonlyArray<AgentStepLog> {
    const rows = this.store.db
      .prepare(`
        SELECT * FROM agent_step_log
        WHERE session_id = ?
        ORDER BY step_index ASC
      `)
      .all(sessionId) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: String(row['id']),
      sessionId: String(row['session_id']),
      stepIndex: Number(row['step_index']),
      thought: row['thought'] ? String(row['thought']) : null,
      toolName: String(row['tool_name']),
      toolArguments: JSON.parse(String(row['tool_arguments'] ?? '{}')) as Record<string, unknown>,
      toolResult: JSON.parse(String(row['tool_result'] ?? '{}')) as Record<string, unknown>,
      createdAt: String(row['created_at']),
    }));
  }

  private mapSessionRow(row: Record<string, unknown>): AgentRunSession {
    return {
      id: String(row['id']),
      projectId: String(row['project_id']),
      goal: String(row['goal']),
      modelName: String(row['model_name']),
      provider: (row['provider'] as AgentRunSession['provider']) ?? 'custom',
      maxIterations: Number(row['max_iterations'] ?? 10),
      iterationsCompleted: Number(row['iterations_completed'] ?? 0),
      status: (row['status'] as AgentRunSession['status']) ?? 'running',
      startedAt: String(row['started_at']),
      completedAt: row['completed_at'] ? String(row['completed_at']) : null,
      patchesGenerated: Number(row['patches_generated'] ?? 0),
      patchesApplied: Number(row['patches_applied'] ?? 0),
    };
  }
}

