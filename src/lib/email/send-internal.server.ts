import { createClient } from '@supabase/supabase-js'

const SITE_NAME = 'FPI STOR'
const SENDER_DOMAIN = 'notify.fpistor.com'
const FROM_DOMAIN = 'notify.fpistor.com'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Server-side (service-role) transactional send used by public app action routes
 * that authorize the caller themselves.
 */
export async function sendTemplateEmailInternal(opts: {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  templateData?: Record<string, any>
}) {
  const [{ createElement }, { render }, { TEMPLATES }] = await Promise.all([
    import('react'),
    import('@react-email/render'),
    import('@/lib/email-templates/registry'),
  ])
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return { ok: false as const, error: 'server_configuration_error' }
  }

  const template = TEMPLATES[opts.templateName]
  if (!template) return { ok: false as const, error: 'template_not_found' }

  const recipient = template.to || opts.recipientEmail
  if (!recipient) return { ok: false as const, error: 'recipient_required' }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const messageId = crypto.randomUUID()
  const normalizedEmail = recipient.toLowerCase()

  const { data: suppressed, error: suppressionError } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (suppressionError) return { ok: false as const, error: 'suppression_check_failed' }
  if (suppressed) return { ok: false as const, error: 'email_suppressed' }

  let unsubscribeToken: string
  const { data: existingToken } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingToken && !existingToken.used_at) {
    unsubscribeToken = existingToken.token
  } else if (!existingToken) {
    unsubscribeToken = generateToken()
    await supabase
      .from('email_unsubscribe_tokens')
      .upsert({ token: unsubscribeToken, email: normalizedEmail }, { onConflict: 'email', ignoreDuplicates: true })
    const { data: storedToken } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()
    if (!storedToken) return { ok: false as const, error: 'token_storage_failed' }
    unsubscribeToken = storedToken.token
  } else {
    return { ok: false as const, error: 'email_suppressed' }
  }

  const element = createElement(template.component, opts.templateData || {})
  const html = await render(element)
  const plainText = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(opts.templateData || {})
      : template.subject

  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: opts.templateName,
    recipient_email: recipient,
    status: 'pending',
  })

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text: plainText,
      purpose: 'transactional',
      label: opts.templateName,
      idempotency_key: opts.idempotencyKey || messageId,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: opts.templateName,
      recipient_email: recipient,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    return { ok: false as const, error: 'enqueue_failed' }
  }

  return { ok: true as const, queued: true }
}
