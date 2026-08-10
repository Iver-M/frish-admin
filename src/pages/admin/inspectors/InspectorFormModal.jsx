import Modal from '../../../components/Modal.jsx'

export default function InspectorFormModal({
  open,
  mode,
  form,
  isSaving,
  error,
  onChange,
  onClose,
  onSubmit,
}) {
  const formId = `${mode}-inspector-form`
  const isCreate = mode === 'create'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isCreate ? 'Register Inspector' : 'Edit Inspector'}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" form={formId} disabled={isSaving}>
            {isSaving ? 'Saving…' : isCreate ? 'Register inspector' : 'Save changes'}
          </button>
        </>
      }
    >
      <form id={formId} className="inspector-form" onSubmit={onSubmit}>
        <div className="inspector-form__note">
          <strong>{isCreate ? 'Google sign-in account required' : 'Authorized Google email'}</strong>
          <span>
            {isCreate
              ? 'Ask the inspector to try Sign in with BFAR Email once. Then copy the new user UID from Firebase Authentication and register the same Google email here.'
              : 'Changing this profile email does not change the inspector’s Firebase Authentication sign-in email.'}
          </span>
        </div>

        <div className="inspector-form__grid">
          {isCreate && (
            <label className="inspector-form__wide">
              <span>Firebase Authentication UID</span>
              <input
                required
                value={form.authUid}
                onChange={(event) => onChange('authUid', event.target.value)}
                placeholder="Paste the inspector user's UID"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck="false"
              />
            </label>
          )}
          <label>
            <span>Inspector ID</span>
            <input
              required
              value={form.employeeId}
              onChange={(event) => onChange('employeeId', event.target.value)}
              placeholder="INS-001"
              maxLength={30}
            />
          </label>
          <label>
            <span>Full name</span>
            <input
              required
              value={form.name}
              onChange={(event) => onChange('name', event.target.value)}
              autoComplete="name"
              maxLength={100}
            />
          </label>
          <label>
            <span>Email address</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => onChange('email', event.target.value)}
              autoComplete="email"
              maxLength={160}
            />
          </label>
          <label>
            <span>Contact number</span>
            <input
              value={form.phone}
              onChange={(event) => onChange('phone', event.target.value)}
              placeholder="09xxxxxxxxx"
              inputMode="tel"
              autoComplete="tel"
              maxLength={24}
            />
          </label>
          <label className="inspector-form__wide">
            <span>Assigned market</span>
            <input value="Pasig Public Market" disabled />
          </label>
        </div>

        {error && <div className="inspector-alert inspector-alert--error" role="alert">{error}</div>}
      </form>
    </Modal>
  )
}
