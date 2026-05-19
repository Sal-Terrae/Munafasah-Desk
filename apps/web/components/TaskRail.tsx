import { type Locale, t } from '../lib/i18n';
import type { ComplianceItemSummary } from '../lib/api';

export function TaskRail({
  tasks,
  locale,
}: {
  tasks: ComplianceItemSummary[];
  locale: Locale;
}): JSX.Element {
  return (
    <section className="panel">
      <h2>{t('taskRail', locale)}</h2>
      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.requirementId} className={`task task-${task.risk}`}>
            <div className="task-text">{task.requirementText}</div>
            <div className="task-meta">
              <span>{t('owner', locale)}: {task.owner}</span>
              {task.dueDate && (
                <span>{t('due', locale)}: {task.dueDate}</span>
              )}
              <span>{t('risk', locale)}: {task.risk}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
