import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronDown,
  Clipboard,
  Copy,
  KeyRound,
  LoaderCircle,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  UserRound,
  UsersRound,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import App from './App';
import { getSupabaseClient, isSupabaseConfigured } from './lib/supabase';

type Membership = {
  tenantId: string;
  tenantName: string;
  role: string;
  status: string;
};

type Identity = {
  name: string;
  email: string;
  memberships: Membership[];
};

type InviteRole = 'admin_cliente' | 'tecnico' | 'tecnico_externo' | 'cliente_lectura';

type Member = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

type Invitation = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
};

const roleLabels: Record<string, string> = {
  admin_cliente: 'Administrador',
  coordinador: 'Coordinador',
  tecnico: 'Técnico',
  tecnico_externo: 'Técnico externo',
  cliente_lectura: 'Solo lectura',
};

const canManageUsers = (role: string | undefined) => role === 'admin_cliente';

function Logo() {
  return (
    <div className="auth-logo">
      <span><Zap size={27} strokeWidth={2.8} /></span>
      <div><strong>IsiVoltPro <b>OT</b></strong><small>Gestión de órdenes de trabajo</small></div>
    </div>
  );
}

async function loadIdentity(session: Session): Promise<Identity> {
  const supabase = getSupabaseClient();
  const [{ data: profile, error: profileError }, { data: memberRows, error: memberError }] = await Promise.all([
    supabase.from('profiles').select('nombre,email').eq('id', session.user.id).maybeSingle(),
    supabase.from('tenant_members').select('tenant_id,role,estado').eq('user_id', session.user.id).eq('estado', 'activo'),
  ]);
  if (profileError) throw profileError;
  if (memberError) throw memberError;

  const tenantIds = (memberRows ?? []).map((row) => String(row.tenant_id));
  const tenantNames = new Map<string, string>();
  if (tenantIds.length > 0) {
    const { data: tenants, error: tenantsError } = await supabase.from('tenants').select('id,nombre').in('id', tenantIds);
    if (tenantsError) throw tenantsError;
    for (const tenant of tenants ?? []) tenantNames.set(String(tenant.id), String(tenant.nombre));
  }

  return {
    name: String(profile?.nombre || session.user.email?.split('@')[0] || 'Usuario'),
    email: String(profile?.email || session.user.email || ''),
    memberships: (memberRows ?? []).map((row) => ({
      tenantId: String(row.tenant_id),
      tenantName: tenantNames.get(String(row.tenant_id)) ?? 'Organización',
      role: String(row.role),
      status: String(row.estado),
    })),
  };
}

function LoadingScreen() {
  return <main className="auth-loading"><LoaderCircle className="spin" size={34} /><strong>Cargando IsiVoltPro OT</strong></main>;
}

function ConfigurationScreen() {
  return <main className="auth-page"><section className="auth-card auth-message-card"><Logo /><AlertTriangle size={34} /><h1>Falta configurar Supabase</h1><p>Añade las variables <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> para activar el acceso real.</p></section></main>;
}

function NoOrganisationScreen({ name, logout }: { name: string; logout: () => void }) {
  return <main className="auth-page"><section className="auth-card auth-message-card"><Logo /><Building2 size={36} /><h1>Hola, {name}</h1><p>Tu cuenta está autenticada, pero todavía no tiene una organización activa. Un administrador debe completar la invitación o reactivar tu membresía.</p><button className="secondary-button" onClick={logout} type="button"><LogOut size={17} /> Cerrar sesión</button></section></main>;
}

function AccessScreen({
  invitationEmail,
  hasInvitation,
  busy,
  message,
  error,
  onLogin,
  onSignUp,
  onReset,
}: {
  invitationEmail: string;
  hasInvitation: boolean;
  busy: boolean;
  message: string;
  error: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onReset: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState(invitationEmail);
  const [password, setPassword] = useState('');
  const [inviteMode, setInviteMode] = useState(hasInvitation);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inviteMode) void onSignUp(email, password);
    else void onLogin(email, password);
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-form-panel">
          <Logo />
          <div className="auth-copy"><span className="section-kicker">{inviteMode ? 'Invitación de acceso' : 'Acceso profesional'}</span><h1>{inviteMode ? 'Crea tu cuenta de trabajo' : 'Todo el mantenimiento bajo control'}</h1><p>{inviteMode ? 'Esta alta está vinculada a una invitación emitida por un administrador.' : 'Accede con tu cuenta de administrador, coordinador o técnico.'}</p></div>
          <form className="auth-form" onSubmit={submit}>
            <label>Correo electrónico<span className="auth-input"><Mail size={18} /><input autoComplete="email" disabled={hasInvitation} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></span></label>
            <label>Contraseña<span className="auth-input"><KeyRound size={18} /><input autoComplete={inviteMode ? 'new-password' : 'current-password'} minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></span></label>
            {error && <p className="auth-feedback error">{error}</p>}
            {message && <p className="auth-feedback success">{message}</p>}
            <button className="primary-button auth-submit" disabled={busy} type="submit">{busy && <LoaderCircle className="spin" size={18} />}{inviteMode ? 'Crear cuenta' : 'Iniciar sesión'}</button>
          </form>
          {!inviteMode && <button className="text-link auth-reset" disabled={!email || busy} onClick={() => void onReset(email)} type="button">¿Has olvidado tu contraseña?</button>}
          {hasInvitation && <button className="secondary-button auth-mode-toggle" onClick={() => setInviteMode((value) => !value)} type="button">{inviteMode ? 'Ya tengo una cuenta' : 'Crear cuenta con la invitación'}</button>}
          <p className="auth-disclaimer">El alta de administradores no es pública. Solo puede iniciarla otro administrador autorizado.</p>
        </div>
        <div className="auth-visual" aria-hidden="true"><div className="auth-grid" /><div className="auth-visual-copy"><span><Wrench size={22} /></span><strong>Trabajo técnico, información clara.</strong><small>Planifica, ejecuta, documenta y valida cada intervención.</small></div></div>
      </section>
    </main>
  );
}

function RecoveryScreen({ busy, error, onSave }: { busy: boolean; error: string; onSave: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('');
  return <main className="auth-page"><section className="auth-card auth-message-card"><Logo /><ShieldCheck size={36} /><h1>Define una contraseña nueva</h1><form className="auth-form recovery-form" onSubmit={(event) => { event.preventDefault(); void onSave(password); }}><label>Nueva contraseña<span className="auth-input"><KeyRound size={18} /><input minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></span></label>{error && <p className="auth-feedback error">{error}</p>}<button className="primary-button auth-submit" disabled={busy} type="submit">Guardar contraseña</button></form></section></main>;
}

function AccountDock({
  identity,
  activeTenantId,
  onTenantChange,
  onUsers,
  onLogout,
}: {
  identity: Identity;
  activeTenantId: string;
  onTenantChange: (tenantId: string) => void;
  onUsers: () => void;
  onLogout: () => void;
}) {
  const membership = identity.memberships.find((item) => item.tenantId === activeTenantId);
  const initials = identity.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <aside className="account-dock" aria-label="Cuenta y organización">
      <span className="account-avatar">{initials || 'U'}</span>
      <div className="account-identity"><strong>{identity.name}</strong><small>{roleLabels[membership?.role ?? ''] ?? membership?.role ?? 'Usuario'}</small></div>
      {identity.memberships.length > 1 ? <label className="tenant-select"><Building2 size={15} /><select onChange={(event) => onTenantChange(event.target.value)} value={activeTenantId}>{identity.memberships.map((item) => <option key={item.tenantId} value={item.tenantId}>{item.tenantName}</option>)}</select><ChevronDown size={15} /></label> : <span className="single-tenant"><Building2 size={15} /> {membership?.tenantName ?? 'Sin organización'}</span>}
      {canManageUsers(membership?.role) && <button className="dock-button" onClick={onUsers} type="button"><UsersRound size={17} /> Usuarios</button>}
      <button className="dock-button dock-logout" onClick={onLogout} type="button"><LogOut size={17} /> Salir</button>
    </aside>
  );
}

function UserManagement({ tenantId, tenantName, onClose }: { tenantId: string; tenantName: string; onClose: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('tecnico');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = getSupabaseClient();
      const [{ data: memberRows, error: membersError }, { data: inviteRows, error: invitesError }] = await Promise.all([
        supabase.from('tenant_members').select('id,user_id,role,estado').eq('tenant_id', tenantId).order('created_at'),
        supabase.from('tenant_invitations').select('id,nombre,email,role,estado,expires_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
      ]);
      if (membersError) throw membersError;
      if (invitesError) throw invitesError;

      const userIds = (memberRows ?? []).map((row) => String(row.user_id));
      const profileMap = new Map<string, { name: string; email: string }>();
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id,nombre,email').in('id', userIds);
        if (profilesError) throw profilesError;
        for (const profile of profiles ?? []) profileMap.set(String(profile.id), { name: String(profile.nombre || 'Usuario'), email: String(profile.email || '') });
      }

      setMembers((memberRows ?? []).map((row) => ({ id: String(row.id), userId: String(row.user_id), name: profileMap.get(String(row.user_id))?.name ?? 'Usuario', email: profileMap.get(String(row.user_id))?.email ?? '', role: String(row.role), status: String(row.estado) })));
      setInvitations((inviteRows ?? []).map((row) => ({ id: String(row.id), name: String(row.nombre || 'Invitación'), email: String(row.email), role: String(row.role), status: String(row.estado || 'pendiente'), expiresAt: String(row.expires_at) })));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar la gestión de usuarios.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { void load(); }, [load]);

  const createInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setGeneratedLink('');
    try {
      const { data, error: invitationError } = await getSupabaseClient().rpc('create_tenant_invitation', {
        tenant_uuid: tenantId,
        invite_email: email,
        invite_role: role,
        require_mfa: mfaRequired,
        invite_name: name,
      });
      if (invitationError) throw invitationError;
      const result = Array.isArray(data) ? data[0] : data;
      const token = String(result?.invitation_token ?? '');
      if (!token) throw new Error('La invitación se creó sin devolver un token válido.');
      const url = new URL(import.meta.env.BASE_URL, window.location.origin);
      url.searchParams.set('invite', token);
      url.searchParams.set('email', email.trim().toLowerCase());
      setGeneratedLink(url.toString());
      setName('');
      setEmail('');
      setMfaRequired(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo crear la invitación.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="users-modal-backdrop" role="presentation">
      <section className="users-modal" role="dialog" aria-modal="true" aria-label="Gestión de usuarios">
        <header className="users-modal-header"><div><span className="section-kicker">Administración</span><h1>Usuarios y accesos</h1><p>{tenantName}</p></div><button className="icon-button" onClick={onClose} type="button"><X size={21} /></button></header>
        <div className="users-modal-body">
          <article className="panel invite-panel">
            <div className="panel-heading"><div><h2>Invitar usuario</h2><p>Crea un acceso controlado para esta organización.</p></div><UserPlus size={24} /></div>
            <form className="invite-form" onSubmit={createInvitation}>
              <label>Nombre<input onChange={(event) => setName(event.target.value)} placeholder="Nombre y apellidos" required value={name} /></label>
              <label>Correo<input onChange={(event) => setEmail(event.target.value)} placeholder="usuario@empresa.com" required type="email" value={email} /></label>
              <label>Rol<select onChange={(event) => setRole(event.target.value as InviteRole)} value={role}><option value="tecnico">Técnico</option><option value="tecnico_externo">Técnico externo</option><option value="admin_cliente">Administrador</option><option value="cliente_lectura">Solo lectura</option></select></label>
              <label className="checkbox-field"><input checked={mfaRequired} onChange={(event) => setMfaRequired(event.target.checked)} type="checkbox" /> Exigir MFA al usuario</label>
              <button className="primary-button" disabled={submitting} type="submit">{submitting ? <LoaderCircle className="spin" size={18} /> : <UserPlus size={18} />} Crear invitación</button>
            </form>
            <p className="invite-security-note"><ShieldCheck size={16} /> Los administradores solo se crean mediante una invitación emitida por otro administrador.</p>
            {generatedLink && <div className="generated-link"><strong>Enlace listo</strong><p>Compártelo únicamente con la persona invitada.</p><div><input readOnly value={generatedLink} /><button className="secondary-button" onClick={() => void copyLink()} type="button">{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Copiado' : 'Copiar'}</button></div></div>}
          </article>
          <div className="users-data-column">
            {error && <p className="auth-feedback error">{error}</p>}
            <article className="panel members-panel"><div className="panel-heading"><div><h2>Miembros activos</h2><p>{members.length} usuarios vinculados</p></div><button className="icon-button" onClick={() => void load()} type="button"><RefreshCw size={18} /></button></div>{loading ? <div className="inline-loading"><LoaderCircle className="spin" size={22} /> Cargando usuarios…</div> : <div className="member-list">{members.map((member) => <div className="member-row" key={member.id}><span className="member-avatar"><UserRound size={18} /></span><span><strong>{member.name}</strong><small>{member.email}</small></span><span className={`member-status ${member.status}`}>{member.status}</span><b>{roleLabels[member.role] ?? member.role}</b></div>)}</div>}</article>
            <article className="panel invitations-panel"><div className="panel-heading"><div><h2>Invitaciones</h2><p>Altas pendientes, aceptadas o caducadas</p></div><Clipboard size={22} /></div><div className="invitation-list">{invitations.length === 0 ? <p className="empty-state">No hay invitaciones registradas.</p> : invitations.map((invitation) => <div className="invitation-row" key={invitation.id}><span><strong>{invitation.name}</strong><small>{invitation.email}</small></span><b>{roleLabels[invitation.role] ?? invitation.role}</b><span className={`invitation-state ${invitation.status}`}>{invitation.status}</span><small>Caduca {new Date(invitation.expiresAt).toLocaleDateString('es-ES')}</small></div>)}</div></article>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function AuthApp() {
  const invitation = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return { token: params.get('invite') ?? '', email: params.get('email') ?? '' };
  }, []);
  const [session, setSession] = useState<Session | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [activeTenantId, setActiveTenantId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [usersOpen, setUsersOpen] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [invitationHandled, setInvitationHandled] = useState(false);

  const refreshIdentity = useCallback(async (activeSession: Session) => {
    const nextIdentity = await loadIdentity(activeSession);
    setIdentity(nextIdentity);
    setActiveTenantId((current) => current && nextIdentity.memberships.some((item) => item.tenantId === current) ? current : nextIdentity.memberships[0]?.tenantId ?? '');
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return undefined; }
    const supabase = getSupabaseClient();
    void supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      if (data.session) {
        try { await refreshIdentity(data.session); } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo cargar el perfil.'); }
      }
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      if (nextSession) void refreshIdentity(nextSession).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'No se pudo cargar el perfil.'));
      else { setIdentity(null); setActiveTenantId(''); }
    });
    return () => listener.subscription.unsubscribe();
  }, [refreshIdentity]);

  useEffect(() => {
    if (!session || !invitation.token || invitationHandled) return;
    setInvitationHandled(true);
    setMessage('Validando la invitación…');
    void getSupabaseClient().rpc('accept_tenant_invitation', { invitation_token: invitation.token }).then(async ({ error: invitationError }) => {
      if (invitationError) { setError(invitationError.message); setMessage(''); return; }
      await refreshIdentity(session);
      setMessage('Invitación aceptada. Ya puedes trabajar en la organización.');
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('invite');
      cleanUrl.searchParams.delete('email');
      window.history.replaceState({}, '', cleanUrl);
    });
  }, [invitation.token, invitationHandled, refreshIdentity, session]);

  const login = async (email: string, password: string) => {
    setBusy(true); setError(''); setMessage('');
    const { error: loginError } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    if (loginError) setError(loginError.message);
    setBusy(false);
  };

  const signUp = async (email: string, password: string) => {
    setBusy(true); setError(''); setMessage('');
    const { data, error: signUpError } = await getSupabaseClient().auth.signUp({ email, password, options: { emailRedirectTo: window.location.href } });
    if (signUpError) setError(signUpError.message);
    else if (!data.session) setMessage('Cuenta creada. Revisa tu correo para confirmarla.');
    else setMessage('Cuenta creada. Validando la invitación…');
    setBusy(false);
  };

  const reset = async (email: string) => {
    setBusy(true); setError(''); setMessage('');
    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
    const { error: resetError } = await getSupabaseClient().auth.resetPasswordForEmail(email, { redirectTo });
    if (resetError) setError(resetError.message);
    else setMessage('Te hemos enviado un correo para restablecer la contraseña.');
    setBusy(false);
  };

  const savePassword = async (password: string) => {
    setBusy(true); setError('');
    const { error: updateError } = await getSupabaseClient().auth.updateUser({ password });
    if (updateError) setError(updateError.message);
    else { setRecoveryMode(false); setMessage('Contraseña actualizada correctamente.'); }
    setBusy(false);
  };

  const logout = async () => {
    setUsersOpen(false);
    await getSupabaseClient().auth.signOut();
  };

  if (loading) return <LoadingScreen />;
  if (!isSupabaseConfigured) return <ConfigurationScreen />;
  if (recoveryMode) return <RecoveryScreen busy={busy} error={error} onSave={savePassword} />;
  if (!session) return <AccessScreen invitationEmail={invitation.email} hasInvitation={Boolean(invitation.token)} busy={busy} message={message} error={error} onLogin={login} onSignUp={signUp} onReset={reset} />;
  if (!identity) return <LoadingScreen />;
  if (identity.memberships.length === 0) return <NoOrganisationScreen name={identity.name} logout={() => void logout()} />;

  const membership = identity.memberships.find((item) => item.tenantId === activeTenantId) ?? identity.memberships[0];

  return (
    <div className="authenticated-root">
      <App tenantId={membership.tenantId} tenantName={membership.tenantName} viewerId={session.user.id} viewerName={identity.name} viewerRole={membership.role} onLogout={() => void logout()} />
      <AccountDock identity={identity} activeTenantId={membership.tenantId} onTenantChange={(tenantId) => { setActiveTenantId(tenantId); setUsersOpen(false); }} onUsers={() => setUsersOpen(true)} onLogout={() => void logout()} />
      {usersOpen && canManageUsers(membership.role) && <UserManagement tenantId={membership.tenantId} tenantName={membership.tenantName} onClose={() => setUsersOpen(false)} />}
      {message && <button className="global-notice" onClick={() => setMessage('')} type="button"><Check size={18} /> {message}<X size={16} /></button>}
    </div>
  );
}
