function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const BREVO_API_KEY  = process.env.BREVO_API_KEY!;
const SENDER_EMAIL   = process.env.BREVO_SENDER_EMAIL!;
const SENDER_NAME    = process.env.BREVO_SENDER_NAME!;
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL!;

interface SendOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, toName, subject, html }: SendOptions) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: to, name: toName || to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `Brevo error ${res.status}`);
  }
}

/* ─────────────────────────────────────────────────────────────
   BASE TEMPLATE
   accent      — CTA button + accent bar color (hex)
   accentDark  — darker shade for button hover border
   icon        — emoji/symbol inside the header badge circle
   iconBg      — background of the icon circle
   label       — small subtitle below the logo
   content     — inner HTML (body section only)
───────────────────────────────────────────────────────────── */
function base({
  accent, accentDark, icon, iconBg, label, content, wide = false,
}: {
  accent: string;
  accentDark: string;
  icon: string;
  iconBg: string;
  label: string;
  content: string;
  wide?: boolean;
}): string {
  const w = wide ? 620 : 560;
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Warehouse Manager</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;-webkit-text-size-adjust:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1f5f9;">
    <tr><td align="center" style="padding:48px 16px 40px;">

      <!-- Card -->
      <table width="${w}" cellpadding="0" cellspacing="0" role="presentation" style="max-width:${w}px;width:100%;">

        <!-- ── HEADER ── -->
        <tr>
          <td style="background:#0f172a;border-radius:16px 16px 0 0;padding:32px 40px 28px;text-align:center;">

            <!-- Logo row -->
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 18px;">
              <tr>
                <td style="vertical-align:middle;padding-right:11px;">
                  <div style="background:#2563eb;border-radius:10px;width:38px;height:38px;text-align:center;line-height:38px;">
                    <span style="color:#fff;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:15px;font-style:italic;letter-spacing:-1px;">WM</span>
                  </div>
                </td>
                <td style="vertical-align:middle;">
                  <span style="color:#f8fafc;font-size:17px;font-weight:700;letter-spacing:-0.3px;">Warehouse Manager</span>
                </td>
              </tr>
            </table>

            <!-- Icon badge -->
            <div style="display:inline-block;width:52px;height:52px;border-radius:50%;background:${iconBg};text-align:center;line-height:52px;font-size:22px;margin-bottom:10px;">${icon}</div>

            <!-- Label -->
            <p style="margin:0;color:#94a3b8;font-size:13px;letter-spacing:0.2px;">${esc(label)}</p>
          </td>
        </tr>

        <!-- ── ACCENT BAR ── -->
        <tr>
          <td style="background:${accent};height:4px;font-size:0;line-height:0;"> </td>
        </tr>

        <!-- ── BODY ── -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px 32px;">
            ${content}
          </td>
        </tr>

        <!-- ── FOOTER ── -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:#64748b;font-weight:600;">Warehouse Manager &nbsp;·&nbsp; Built by PixelCore</p>
            <p style="margin:0;font-size:11px;color:#94a3b8;">
              <a href="${APP_URL}" style="color:#94a3b8;text-decoration:none;">${APP_URL}</a>
              &nbsp;·&nbsp; If you didn't request this, you can safely ignore it.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ── Reusable inner pieces ── */

function ctaButton(href: string, text: string, color: string, colorDark: string) {
  return `
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:28px auto 0;">
      <tr>
        <td style="border-radius:10px;background:${color};border-bottom:3px solid ${colorDark};">
          <a href="${href}"
             style="display:block;padding:14px 38px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.1px;text-align:center;border-radius:10px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>`;
}

function fallbackLink(href: string, color: string) {
  return `
    <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.7;">
      Or paste this link in your browser:<br>
      <a href="${href}" style="color:${color};word-break:break-all;text-decoration:none;">${href}</a>
    </p>`;
}

function infoBox(rows: { label: string; value: string }[], accent: string) {
  const cells = rows.map(r => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;width:120px;">${esc(r.label)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;font-weight:600;">${esc(r.value)}</td>
    </tr>`).join('');

  return `
    <div style="border-left:4px solid ${accent};border-radius:0 10px 10px 0;background:#f8fafc;padding:4px 20px;margin:20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">${cells}</table>
    </div>`;
}

function greeting(name: string) {
  return `<p style="margin:0 0 12px;font-size:16px;color:#0f172a;font-weight:700;">Hi, ${esc(name)} 👋</p>`;
}

/* ── Task / notification helpers ── */

function fmtTaskStatus(s: string) {
  return s === 'IN_PROGRESS' ? 'In Progress' : s === 'DONE' ? 'Done' : 'Pending';
}

function fmtTaskPriority(p: string) {
  return ({ urgent: 'Urgent', high: 'High', normal: 'Normal', low: 'Low' } as Record<string, string>)[p.toLowerCase()] ?? p;
}

/* ═══════════════════════════════════════════════════════════
   EMAIL TEMPLATES
═══════════════════════════════════════════════════════════ */

export function verificationEmail(name: string, token: string) {
  const link = `${APP_URL}/auth/callback?token=${token}`;
  return {
    subject: 'Verify your email — Warehouse Manager',
    html: base({
      accent: '#2563eb', accentDark: '#1d4ed8',
      icon: '✉️', iconBg: 'rgba(37,99,235,0.15)',
      label: 'Email verification',
      content: `
        ${greeting(name)}
        <p style="margin:0 0 6px;font-size:14px;color:#475569;line-height:1.7;">
          Thanks for signing up! Click the button below to verify your email address and activate your account.
        </p>
        <p style="margin:0;font-size:13px;color:#94a3b8;">This link expires in <strong style="color:#475569;">24 hours</strong>.</p>
        ${ctaButton(link, 'Verify my email', '#2563eb', '#1d4ed8')}
        ${fallbackLink(link, '#2563eb')}
      `,
    }),
  };
}

export function passwordResetEmail(name: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  return {
    subject: 'Reset your password — Warehouse Manager',
    html: base({
      accent: '#7c3aed', accentDark: '#6d28d9',
      icon: '🔒', iconBg: 'rgba(124,58,237,0.15)',
      label: 'Password reset request',
      content: `
        ${greeting(name)}
        <p style="margin:0 0 6px;font-size:14px;color:#475569;line-height:1.7;">
          We received a request to reset the password for your account. Click the button below to choose a new one.
        </p>
        <p style="margin:0;font-size:13px;color:#94a3b8;">
          This link expires in <strong style="color:#475569;">1 hour</strong>.
          If you didn't request this, you can safely ignore this email — your password won't change.
        </p>
        ${ctaButton(link, 'Reset my password', '#7c3aed', '#6d28d9')}
        ${fallbackLink(link, '#7c3aed')}
      `,
    }),
  };
}

export function activationEmail(ownerName: string, companyName: string, link: string) {
  return {
    subject: 'Your Warehouse Manager access is ready',
    html: base({
      accent: '#059669', accentDark: '#047857',
      icon: '🚀', iconBg: 'rgba(5,150,105,0.15)',
      label: 'Account activation',
      content: `
        ${greeting(ownerName)}
        <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
          Your company has been reviewed and approved. Click below to activate your account and start managing your warehouses.
        </p>
        ${infoBox([{ label: 'Company', value: companyName }], '#059669')}
        <p style="margin:0;font-size:13px;color:#94a3b8;">This activation link expires in <strong style="color:#475569;">1 hour</strong>.</p>
        ${ctaButton(link, 'Activate my account', '#059669', '#047857')}
        ${fallbackLink(link, '#059669')}
      `,
    }),
  };
}

export function clientApprovedEmail(ownerName: string, companyName: string) {
  const loginUrl = `${APP_URL}/login`;
  return {
    subject: 'Your account has been approved — Warehouse Manager',
    html: base({
      accent: '#059669', accentDark: '#047857',
      icon: '✅', iconBg: 'rgba(5,150,105,0.15)',
      label: 'Account approved',
      content: `
        ${greeting(ownerName)}
        <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
          Great news! Your company has been approved and your account is now active. You can sign in and start using Warehouse Manager right away.
        </p>
        ${infoBox([{ label: 'Company', value: companyName }], '#059669')}
        ${ctaButton(loginUrl, 'Sign in to Warehouse Manager', '#059669', '#047857')}
      `,
    }),
  };
}

export function clientRejectedEmail(ownerName: string, companyName: string) {
  return {
    subject: 'Update on your access request — Warehouse Manager',
    html: base({
      accent: '#dc2626', accentDark: '#b91c1c',
      icon: '📋', iconBg: 'rgba(220,38,38,0.12)',
      label: 'Access request update',
      content: `
        ${greeting(ownerName)}
        <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
          Thank you for your interest in Warehouse Manager. Unfortunately, we were unable to approve the access request for your company at this time.
        </p>
        ${infoBox([{ label: 'Company', value: companyName }], '#dc2626')}
        <p style="margin:0;font-size:13px;color:#475569;line-height:1.7;">
          If you believe this is a mistake or would like more information, please reply to this email and we'll be happy to help.
        </p>
      `,
    }),
  };
}

export function clientDeletedEmail(ownerName: string, companyName: string) {
  return {
    subject: 'Account removed — Warehouse Manager',
    html: base({
      accent: '#64748b', accentDark: '#475569',
      icon: '🗑️', iconBg: 'rgba(100,116,139,0.12)',
      label: 'Account notification',
      content: `
        ${greeting(ownerName)}
        <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
          Your company account and all associated data have been permanently removed from Warehouse Manager.
        </p>
        ${infoBox([{ label: 'Company', value: companyName }], '#64748b')}
        <p style="margin:0;font-size:13px;color:#475569;line-height:1.7;">
          If you have questions about this action, please reply to this email.
        </p>
      `,
    }),
  };
}

export function adminNewRequestEmail(companyName: string, ownerName: string, ownerEmail: string) {
  const ADMIN_PATH = process.env.ADMIN_PANEL_PATH || 'admin-k9x2m7';
  const adminUrl = `${APP_URL}/${ADMIN_PATH}`;
  return {
    subject: `New access request — ${companyName.replace(/[\r\n]/g, ' ').trim()}`,
    html: base({
      accent: '#d97706', accentDark: '#b45309',
      icon: '🏢', iconBg: 'rgba(217,119,6,0.15)',
      label: 'Admin notification — new request',
      content: `
        <p style="margin:0 0 16px;font-size:16px;color:#0f172a;font-weight:700;">New company requesting access</p>
        <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
          A new company has submitted an access request. Review it in the admin panel and approve or reject it.
        </p>
        ${infoBox([
          { label: 'Company', value: companyName },
          { label: 'Owner',   value: ownerName   },
          { label: 'Email',   value: ownerEmail   },
        ], '#d97706')}
        ${ctaButton(adminUrl, 'Review in Admin Panel', '#d97706', '#b45309')}
      `,
    }),
  };
}

/* ── Task assigned notification ── */

export function taskAssignedEmail(
  workerName: string,
  taskTitle: string,
  taskType: string,
  priority: string,
  dueDate: string,
  ownerName: string,
) {
  const link = `${APP_URL}/tasks`;
  let fmtDue = 'Not set';
  if (dueDate) {
    const d = new Date(dueDate);
    fmtDue = isNaN(d.getTime()) ? dueDate : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  return {
    subject: `New task assigned: ${taskTitle}`,
    html: base({
      accent: '#4f46e5', accentDark: '#4338ca',
      icon: '📋', iconBg: 'rgba(79,70,229,0.15)',
      label: 'Task assignment',
      content: `
        ${greeting(workerName)}
        <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
          You have been assigned a new task. Log in to view it and get started when you're ready.
        </p>
        ${infoBox([
          { label: 'Task',        value: taskTitle },
          { label: 'Type',        value: taskType },
          { label: 'Priority',    value: fmtTaskPriority(priority) },
          { label: 'Due date',    value: fmtDue },
          { label: 'Assigned by', value: ownerName },
        ], '#4f46e5')}
        ${ctaButton(link, 'View Task →', '#4f46e5', '#4338ca')}
      `,
    }),
  };
}

/* ── Task status changed notification ── */

export function taskStatusEmail(
  ownerName: string,
  workerName: string,
  taskTitle: string,
  oldStatus: string,
  newStatus: string,
) {
  const link = `${APP_URL}/tasks`;
  const isDone = newStatus === 'DONE';
  const accent = isDone ? '#059669' : '#d97706';
  const accentDark = isDone ? '#047857' : '#b45309';
  return {
    subject: `Task update — "${taskTitle}" is now ${fmtTaskStatus(newStatus)}`,
    html: base({
      accent, accentDark,
      icon: isDone ? '✅' : '🔄',
      iconBg: isDone ? 'rgba(5,150,105,0.15)' : 'rgba(217,119,6,0.15)',
      label: 'Task status update',
      content: `
        ${greeting(ownerName)}
        <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
          <strong style="color:#0f172a;">${esc(workerName)}</strong> updated the status of a task.
        </p>
        ${infoBox([
          { label: 'Task',   value: taskTitle },
          { label: 'Worker', value: workerName },
          { label: 'Was',    value: fmtTaskStatus(oldStatus) },
          { label: 'Now',    value: fmtTaskStatus(newStatus) },
        ], accent)}
        ${ctaButton(link, 'View Task →', accent, accentDark)}
      `,
    }),
  };
}

/* ── Chat digest ── */

export function chatDigestEmail(
  userName: string,
  companyName: string,
  messageCount: number,
  previews: { sender: string; text: string }[],
) {
  const link = `${APP_URL}/chat`;
  const previewHtml = previews.length > 0
    ? `<div style="border-left:4px solid #7c3aed;border-radius:0 10px 10px 0;background:#faf5ff;padding:4px 20px;margin:20px 0;">
         <table width="100%" cellpadding="0" cellspacing="0">
           ${previews.map(p => `
             <tr>
               <td style="padding:10px 0;border-bottom:1px solid #f3e8ff;">
                 <div style="font-size:12px;font-weight:700;color:#6d28d9;margin-bottom:3px;">${esc(p.sender)}</div>
                 <div style="font-size:13px;color:#374151;">${esc(p.text.length > 90 ? p.text.slice(0, 90) + '…' : p.text)}</div>
               </td>
             </tr>`).join('')}
         </table>
       </div>`
    : '';
  return {
    subject: `${messageCount} new message${messageCount !== 1 ? 's' : ''} in ${companyName} team chat`,
    html: base({
      accent: '#7c3aed', accentDark: '#6d28d9',
      icon: '💬', iconBg: 'rgba(124,58,237,0.15)',
      label: 'Team chat digest',
      content: `
        ${greeting(userName)}
        <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.7;">
          You have <strong style="color:#0f172a;">${messageCount} new message${messageCount !== 1 ? 's' : ''}</strong> waiting in the
          <strong style="color:#0f172a;">${esc(companyName)}</strong> team chat.
        </p>
        ${previewHtml}
        ${ctaButton(link, 'Open Chat →', '#7c3aed', '#6d28d9')}
      `,
    }),
  };
}

/* ── Snapshot report (wide, special layout) ── */

export function snapshotReportEmail(opts: {
  warehouseName: string;
  date: string;
  total: number;
  pending: number;
  ready: number;
  delivered: number;
  vaults: { row: string; column: number; level: number; client_name: string; job_type?: string; estado?: string; status?: string }[];
}) {
  const { warehouseName, date, total, pending, ready, delivered, vaults } = opts;

  /* KPI card */
  const kpi = (val: number, lbl: string, bg: string, fg: string, border: string) =>
    `<td style="padding:0 4px;width:25%;">
       <div style="background:${bg};border:1px solid ${border};border-radius:12px;padding:16px 12px;text-align:center;">
         <div style="font-size:26px;font-weight:800;color:${fg};line-height:1;">${val}</div>
         <div style="font-size:11px;color:${fg};margin-top:4px;font-weight:600;opacity:.8;">${lbl}</div>
       </div>
     </td>`;

  /* Client & job breakdown */
  const clientMap: Record<string, { total: number; pending: number; ready: number; delivered: number; jobTypes: Set<string> }> = {};
  for (const v of vaults) {
    const cl = v.client_name || '(No client)';
    const st = v.estado || v.status || 'PENDING';
    const jt = v.job_type || '';
    if (!clientMap[cl]) clientMap[cl] = { total: 0, pending: 0, ready: 0, delivered: 0, jobTypes: new Set() };
    clientMap[cl].total++;
    if (st === 'PENDING')   clientMap[cl].pending++;
    if (st === 'READY')     clientMap[cl].ready++;
    if (st === 'DELIVERED') clientMap[cl].delivered++;
    if (jt) clientMap[cl].jobTypes.add(jt);
  }
  const clients = Object.entries(clientMap).sort((a, b) => b[1].total - a[1].total);

  const jobMap: Record<string, number> = {};
  for (const v of vaults) { const jt = v.job_type || 'Other'; jobMap[jt] = (jobMap[jt] || 0) + 1; }
  const jobs = Object.entries(jobMap).sort((a, b) => b[1] - a[1]);

  const n = (val: number, bg: string, fg: string) =>
    val > 0
      ? `<span style="background:${bg};color:${fg};padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;">${val}</span>`
      : `<span style="color:#d1d5db;">—</span>`;

  const clientRows = clients.map(([name]) => {
    const c = clientMap[name];
    return `<tr>
      <td style="padding:6px 8px;font-weight:600;color:#111827;font-size:12px;border-bottom:1px solid #f3f4f6;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(name)}</td>
      <td style="padding:6px 8px;text-align:center;font-size:11px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${esc([...c.jobTypes].join(', ') || '—')}</td>
      <td style="padding:6px 8px;text-align:center;font-weight:700;color:#111827;font-size:13px;border-bottom:1px solid #f3f4f6;">${c.total}</td>
      <td style="padding:6px 8px;text-align:center;border-bottom:1px solid #f3f4f6;">${n(c.pending,'#fef3c7','#92400e')}</td>
      <td style="padding:6px 8px;text-align:center;border-bottom:1px solid #f3f4f6;">${n(c.ready,'#d1fae5','#065f46')}</td>
      <td style="padding:6px 8px;text-align:center;border-bottom:1px solid #f3f4f6;">${n(c.delivered,'#dbeafe','#1e40af')}</td>
    </tr>`;
  }).join('');

  const jobRows = jobs.map(([name, count]) =>
    `<tr>
      <td style="padding:6px 8px;color:#111827;font-size:12px;border-bottom:1px solid #f3f4f6;">${esc(name)}</td>
      <td style="padding:6px 8px;text-align:center;font-weight:700;color:#111827;font-size:13px;border-bottom:1px solid #f3f4f6;">${count}</td>
      <td style="padding:6px 8px;text-align:center;color:#6b7280;font-size:12px;border-bottom:1px solid #f3f4f6;">${total > 0 ? Math.round(count / total * 100) : 0}%</td>
    </tr>`
  ).join('');

  const thStyle = 'padding:6px 8px;text-align:left;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;background:#f9fafb;';
  const thCStyle = 'padding:6px 8px;text-align:center;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;background:#f9fafb;';

  const bodyContent = `
    <!-- Warehouse + date strip -->
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:12px 20px;margin-bottom:24px;text-align:center;">
      <span style="font-size:15px;font-weight:700;color:#0c4a6e;">${esc(warehouseName)}</span>
      <span style="color:#7dd3fc;margin:0 10px;font-size:14px;">·</span>
      <span style="font-size:14px;color:#0369a1;">${esc(date)}</span>
    </div>

    <!-- KPI row -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        ${kpi(total,     'Total Vaults', '#f8fafc', '#334155', '#e2e8f0')}
        ${kpi(pending,   'Pending',      '#fefce8', '#92400e', '#fef08a')}
        ${kpi(ready,     'Ready',        '#f0fdf4', '#14532d', '#bbf7d0')}
        ${kpi(delivered, 'Delivered',    '#eff6ff', '#1e3a8a', '#bfdbfe')}
      </tr>
    </table>

    <!-- Clients section -->
    <div style="border-top:1px solid #f1f5f9;padding-top:20px;margin-bottom:20px;">
      <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:.07em;text-transform:uppercase;">Clients in this Warehouse</p>
      <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead><tr>
          <th style="${thStyle}">Client</th>
          <th style="${thStyle}">Job Type</th>
          <th style="${thCStyle}">Vaults</th>
          <th style="${thCStyle}">Pending</th>
          <th style="${thCStyle}">Ready</th>
          <th style="${thCStyle}">Delivered</th>
        </tr></thead>
        <tbody>${clientRows || '<tr><td colspan="6" style="padding:12px;text-align:center;color:#9ca3af;font-size:12px;">No client data</td></tr>'}</tbody>
      </table>
    </div>

    <!-- Job types section -->
    <div>
      <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:.07em;text-transform:uppercase;">By Job Type</p>
      <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead><tr>
          <th style="${thStyle}">Type</th>
          <th style="${thCStyle}">Count</th>
          <th style="${thCStyle}">%</th>
        </tr></thead>
        <tbody>${jobRows || '<tr><td colspan="3" style="padding:12px;text-align:center;color:#9ca3af;font-size:12px;">No job data</td></tr>'}</tbody>
      </table>
    </div>
  `;

  return {
    subject: `Snapshot Report — ${warehouseName} · ${date}`,
    html: base({
      accent: '#2563eb', accentDark: '#1d4ed8',
      icon: '📊', iconBg: 'rgba(37,99,235,0.15)',
      label: 'Snapshot Report',
      content: bodyContent,
      wide: true,
    }),
  };
}
