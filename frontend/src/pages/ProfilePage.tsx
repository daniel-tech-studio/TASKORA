import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { PageHeader } from '../components/layout/AppShell';
import { Avatar } from '../components/layout/Avatar';
import { Button } from '../components/ui/Button';
import { PasswordField, TextField } from '../components/ui/Field';
import { InlineAlert } from '../components/ui/Feedback';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { usersApi } from '../lib/api/endpoints';
import { ApiError, errorMessage } from '../lib/api/errors';
import { isEmail, NAME_MAX, PASSWORD_MIN, passwordError } from './validation';

/** E05 — Mon profil : identité, sécurité, session (llm.md E05, backend.md D3). */
export function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;
  const since = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(user.createdAt));
  return (
    <>
      <PageHeader title="Mon profil" subtitle="Gérez vos informations personnelles et votre sécurité." />
      <section aria-label="Identité" className="card halo-bg relative mb-6 flex flex-col items-center gap-4 overflow-hidden p-6 text-center sm:flex-row sm:text-left">
        <Avatar name={user.name} size="xl" />
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold break-words text-ink">{user.name}</p>
          <p className="text-sm break-all text-muted">{user.email}</p>
          <p className="mt-1 text-xs text-subtle">Membre depuis {since}</p>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <PersonalInfoCard />
        <div className="flex flex-col gap-6">
          <SecurityCard />
          <SessionCard />
        </div>
      </div>
    </>
  );
}

function CardTitle({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-ink">{icon}</span>
      <div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}

function PersonalInfoCard() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user!.name);
  const [email, setEmail] = useState(user!.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; currentPassword?: string }>({});
  const [status, setStatus] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const emailChanged = email.trim().toLowerCase() !== user!.email;
  const dirty = name.trim() !== user!.name || emailChanged;

  useEffect(() => {
    if (!emailChanged) setCurrentPassword('');
  }, [emailChanged]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || !dirty) return;
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Le nom est obligatoire.';
    else if (name.trim().length > NAME_MAX) next.name = `Le nom doit contenir au plus ${NAME_MAX} caractères.`;
    if (!isEmail(email)) next.email = 'Saisissez une adresse e-mail valide.';
    if (emailChanged && !currentPassword) next.currentPassword = "Saisissez votre mot de passe actuel pour changer d'adresse e-mail.";
    setErrors(next);
    setStatus(null);
    if (Object.values(next).some(Boolean)) return;

    setPending(true);
    try {
      const updated = await usersApi.updateProfile({
        ...(name.trim() !== user!.name ? { name: name.trim() } : {}),
        ...(emailChanged ? { email: email.trim(), currentPassword } : {}),
      });
      setUser(updated); // la navigation et l'avatar reflètent immédiatement la nouvelle identité
      setName(updated.name);
      setEmail(updated.email);
      setCurrentPassword('');
      setStatus({ tone: 'success', text: 'Vos informations ont été enregistrées.' });
      toast.success('Profil mis à jour');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_USED') setErrors({ email: 'Cette adresse e-mail est déjà utilisée.' });
      else if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
        setErrors({ name: error.fieldError('name'), email: error.fieldError('email'), currentPassword: error.fieldError('currentPassword') });
        if (error.fieldError('currentPassword')) {
          setCurrentPassword('');
          passwordRef.current?.focus();
        }
      } else setStatus({ tone: 'danger', text: errorMessage(error, "Vos informations n'ont pas pu être enregistrées.") });
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-labelledby="info-title" className="card p-5 sm:p-6">
      <div id="info-title">
        <CardTitle icon={<UserRound className="size-5" aria-hidden />} title="Informations personnelles" description="Votre nom et votre adresse de connexion." />
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {status && <InlineAlert tone={status.tone}>{status.text}</InlineAlert>}
        <TextField label="Nom complet" autoComplete="name" value={name} onChange={(e) => (setName(e.target.value), setErrors((x) => ({ ...x, name: undefined })))} error={errors.name} required />
        <TextField
          label="Adresse e-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => (setEmail(e.target.value), setErrors((x) => ({ ...x, email: undefined })))}
          error={errors.email}
          required
        />
        {emailChanged && (
          <div className="animate-rise-in">
            <PasswordField
              ref={passwordRef}
              label="Mot de passe actuel"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => (setCurrentPassword(e.target.value), setErrors((x) => ({ ...x, currentPassword: undefined })))}
              error={errors.currentPassword}
              hint="Requis pour confirmer le changement d'adresse e-mail."
              required
            />
          </div>
        )}
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={!dirty} loading={pending} loadingText="Enregistrement…">
            Enregistrer les modifications
          </Button>
        </div>
      </form>
    </section>
  );
}

function SecurityCard() {
  const toast = useToast();
  const [values, setValues] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [status, setStatus] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const set = (k: keyof typeof values, v: string) => {
    setValues((x) => ({ ...x, [k]: v }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const next: typeof errors = {};
    if (!values.current) next.current = 'Saisissez votre mot de passe actuel.';
    next.next = passwordError(values.next);
    if (!next.next && values.next === values.current) next.next = "Le nouveau mot de passe doit être différent de l'actuel.";
    if (!values.confirm) next.confirm = 'Confirmez le nouveau mot de passe.';
    else if (values.confirm !== values.next) next.confirm = 'Les mots de passe ne correspondent pas.';
    setErrors(next);
    setStatus(null);
    if (Object.values(next).some(Boolean)) return;

    setPending(true);
    try {
      await usersApi.changePassword({ currentPassword: values.current, newPassword: values.next });
      setValues({ current: '', next: '', confirm: '' }); // effacement après succès (llm.md E05)
      setStatus({ tone: 'success', text: 'Mot de passe modifié. Vos autres appareils ont été déconnectés.' });
      toast.success('Mot de passe modifié');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
        setErrors({ current: error.fieldError('currentPassword'), next: error.fieldError('newPassword') });
        setValues((x) => ({ ...x, current: '' }));
      } else setStatus({ tone: 'danger', text: errorMessage(error, "Le mot de passe n'a pas pu être modifié.") });
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-labelledby="security-title" className="card p-5 sm:p-6">
      <div id="security-title">
        <CardTitle icon={<ShieldCheck className="size-5" aria-hidden />} title="Sécurité" description="Modifiez votre mot de passe de connexion." />
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {status && <InlineAlert tone={status.tone}>{status.text}</InlineAlert>}
        <PasswordField label="Mot de passe actuel" autoComplete="current-password" value={values.current} onChange={(e) => set('current', e.target.value)} error={errors.current} required />
        <PasswordField
          label="Nouveau mot de passe"
          autoComplete="new-password"
          value={values.next}
          onChange={(e) => set('next', e.target.value)}
          error={errors.next}
          hint={`Au moins ${PASSWORD_MIN} caractères. Les autres sessions seront déconnectées.`}
          required
        />
        <PasswordField label="Confirmer le nouveau mot de passe" autoComplete="new-password" value={values.confirm} onChange={(e) => set('confirm', e.target.value)} error={errors.confirm} required />
        <div className="flex justify-end pt-1">
          <Button type="submit" loading={pending} loadingText="Modification…" icon={<KeyRound className="size-[18px]" aria-hidden />}>
            Modifier le mot de passe
          </Button>
        </div>
      </form>
    </section>
  );
}

function SessionCard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const doLogout = async () => {
    setPending(true);
    try {
      await logout();
      toast.info('Vous êtes déconnecté.');
    } finally {
      setPending(false);
      navigate('/connexion', { replace: true });
    }
  };
  return (
    <section aria-labelledby="session-title" className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
      <div className="flex-1">
        <h2 id="session-title" className="text-lg font-semibold text-ink">
          Session
        </h2>
        <p className="text-sm text-muted">Fermez votre session sur cet appareil. Vos autres appareils restent connectés.</p>
      </div>
      <Button variant="secondary" onClick={doLogout} loading={pending} loadingText="Déconnexion…" icon={<LogOut className="size-[18px]" aria-hidden />} className="text-danger hover:border-danger/40 hover:bg-danger-soft">
        Se déconnecter
      </Button>
    </section>
  );
}
