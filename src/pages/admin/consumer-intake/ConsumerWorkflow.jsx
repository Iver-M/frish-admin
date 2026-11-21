import { consumerWorkflow } from '../../../services/consumerAuthorityPolicy.js'

export default function ConsumerWorkflow({ status }) {
  const steps = consumerWorkflow(status)
  const current = steps.findIndex(([key]) => key === status)
  return (
    <ol className="authority-workflow" aria-label="Consumer report progress">
      {steps.map(([key, label], index) => (
        <li
          key={key}
          className={index < current ? 'authority-workflow__step--complete' : undefined}
          aria-current={index === current ? 'step' : undefined}
        >
          <span className="authority-workflow__dot" aria-hidden="true">{index < current ? '✓' : ''}</span>
          <span>{label}</span>
        </li>
      ))}
    </ol>
  )
}
