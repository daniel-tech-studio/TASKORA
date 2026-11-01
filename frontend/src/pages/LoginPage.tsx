import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button } from '../components/ui/Button';
import { PasswordField, TextField } from '../components/ui/Field';
import { InlineAlert } from '../components/ui/Feedback';
import { useAuth } from '../lib/auth';
import { ApiError, errorMessage } from '../lib/api/errors';
import { isEmail } from './validation';
import { safeDestination } from '../lib/navigation';

/** E01 — Connexion. Pas de lien « mot de passe oublié » (hors V1). */
export function LoginPage() {
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Connexion · TASKORA';
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const next: typeof errors = {};
    if (!email.trim()) next.email = "L'adresse e-mail est obligatoire.";
    else if (!isEmail(email)) next.email = "Saisissez une adresse e-mail valide (ex. vous@exemple.com).";
    if (!password) next.password = 'Le mot de passe est obligatoire.';
    setErrors(next);
    setFormError(null);
    if (next.email) return emailRef.current?.focus();
    if (next.password) return passwordRef.current?.focus();

    setPending(true);
    try {
      await login(email.trim(), password);
      navigate(safeDestination(from), { replace: true });
    } catch (error) {
      setPassword('');
      if (error instanceof ApiError && error.code === 'UNAUTHORIZED') setFormError('Adresse e-mail ou mot de passe incorrect.');
      else setFormError(errorMessage(error, 'Connexion impossible pour le moment.'));
      passwordRef.current?.focus();
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout tagline="Retrouvez votre espace personnel et reprenez là où vous vous étiez arrêté." points={['Tableau de bord clair et motivant', 'Vue Liste et Kanban synchronisées', 'Vos tâches restent privées']}>
      <h1 className="text-[26px] font-bold text-ink sm:text-[28px]">Bon retour sur TASKORA</h1>
      <p className="mt-1.5 text-[15px] text-muted">Connectez-vous pour retrouver vos tâches.</p>
      <form onSubmit={submit} noValidate className="mt-7 flex flex-col gap-4">
        {sessionExpired && !formError && <InlineAlert tone="info">Votre session a expiré. Reconnectez-vous pour continuer.</InlineAlert>}
        {formError && <InlineAlert>{formError}</InlineAlert>}
        <TextField
          ref={emailRef}
          label="Adresse e-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="vous@exemple.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((x) => ({ ...x, email: undefined }));
          }}
          error={errors.email}
          required
        />
        <PasswordField
          ref={passwordRef}
          label="Mot de passe"
          autoComplete="current-password"
          placeholder="Votre mot de passe"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((x) => ({ ...x, password: undefined }));
          }}
          error={errors.password}
          required
        />
        <Button type="submit" size="lg" loading={pending} loadingText="Connexion…" className="mt-2 w-full">
          Se connecter
          <ArrowRight className="size-[18px]" aria-hidden />
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Pas encore de compte ?{' '}
        <Link to="/inscription" className="font-semibold text-brand underline-offset-4 hover:underline">
          Créer un compte
        </Link>
      </p>
    </AuthLayout>
  );
}
