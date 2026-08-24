export function getReleasePolicy(release, now = Date.now()) {
  const deadlineTime = release?.deadline_at ? Date.parse(release.deadline_at) : NaN;
  const deadlineExpired = Number.isFinite(deadlineTime) && now >= deadlineTime;
  const configuredMandatory = Boolean(release?.mandatory);
  return {
    mandatory: configuredMandatory || deadlineExpired,
    mandatoryReason: configuredMandatory ? 'configured' : deadlineExpired ? 'deadline' : null,
    deadlineExpired
  };
}

export function normalizeFutureDeadline(value, now = Date.now()) {
  if (!value) throw new Error('deadline_required');
  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) throw new Error('deadline_required');
  if (deadline.getTime() <= now) throw new Error('deadline_must_be_future');
  return deadline.toISOString();
}
