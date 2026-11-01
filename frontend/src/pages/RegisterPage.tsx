import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button } from '../components/ui/Button';
import { PasswordField, TextField } from '../components/ui/Field';
import { InlineAlert } from '../components/ui/Feedback';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { ApiError, errorMessage } from '../lib/api/errors';
import { isEmail, NAME_MAX, PASSWORD_MIN, passwordError } from './validation';

type Field = 'name' | 'email' | 'password' | 'confirm';

/** E02 — Inscription : la session est ouverte immédiatement par le service (backend.md D2). */
export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [values, setValues] = useState<Record<Field, string>>({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const refs = { name: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null), password: useRef<HTMLInputElement>(null), confirm: useRef<HTMLInputElement>(null) };

  useEffect(() => {
    document.title = 'Inscription · TASKORA';
  }, []);

  const set = (field: Field, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const next: Partial<Record<Field, string>> = {};
    if (!values.name.trim()) next.name = 'Le nom est obligatoire.';
    else if (values.name.trim().length > NAME_MAX) next.name = `Le nom doit contenir au plus ${NAME_MAX} caractères.`;
    if (!values.email.trim()) next.email = "L'adresse e-mail est obligatoire.";
    else if (!isEmail(values.email)) next.email = 'Saisissez une adresse e-mail valide (ex. vous@exemple.com).';
    next.password = passwordError(values.password);
    if (!values.confirm) next.confirm = 'Confirmez votre mot de passe.';
    else if (values.confirm !== values.password) next.confirm = 'Les mots de passe ne correspondent pas.';
    const firstInvalid = (['name', 'email', 'password', 'confirm'] as Field[]).find((f) => next[f]);
    setErrors(next);
    setFormError(null);
    if (firstInvalid) return refs[firstInvalid].current?.focus();

    setPending(true);
    try {
      await register(values.name.trim(), values.email.trim(), values.password);
      toast.success('Bienvenue sur TASKORA !');
      navigate('/tableau-de-bord', { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_USED') {
        setErrors({ email: 'Cette adresse e-mail est déjà utilisée.' });
        refs.email.current?.focus();
      } else if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
        setErrors({ name: error.fieldError('name'), email: error.fieldError('email'), password: error.fieldError('password') });
        setFormError(errorMessage(error));
      } else {
        setFormError(errorMessage(error, 'Inscription impossible pour le moment.'));
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout tagline="Un espace simple et soigné pour enregistrer, prioriser et terminer ce qui compte." points={['Priorités et échéances lisibles', 'Suivi de progression en temps réel', 'Mode clair et sombre']}>
      <h1 className="text-[26px] font-bold text-ink sm:text-[28px]">Créez votre espace TASKORA</h1>
      <p className="mt-1.5 text-[15px] text-muted">Organisez vos tâches à votre rythme.</p>
      <form onSubmit={submit} noValidate className="mt-7 flex flex-col gap-4">
        {formError && <InlineAlert>{formError}</InlineAlert>}
        <TextField ref={refs.name} label="Nom complet" autoComplete="name" placeholder="Ex. Awa Dossou" value={values.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required maxLength={NAME_MAX + 10} />
        <TextField
          ref={refs.email}
          label="Adresse e-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="vous@exemple.com"
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
          error={errors.email}
          required
        />
        <PasswordField
          ref={refs.password}
          label="Mot de passe"
          autoComplete="new-password"
          placeholder="Au moins 8 caractères"
          value={values.password}
          onChange={(e) => set('password', e.target.value)}
          error={errors.password}
          hint={`Au moins ${PASSWORD_MIN} caractères. Les espaces sont autorisés : une phrase de passe est idéale.`}
          required
        />
        <PasswordField
          ref={refs.confirm}
          label="Confirmer le mot de passe"
          autoComplete="new-password"
          placeholder="Saisissez-le à nouveau"
          value={values.confirm}
          onChange={(e) => set('confirm', e.target.value)}
          error={errors.confirm}
          required
        />
        <Button type="submit" size="lg" loading={pending} loadingText="Création du compte…" className="mt-2 w-full">
          Créer mon compte
          <ArrowRight className="size-[18px]" aria-hidden />
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Déjà un compte ?{' '}
        <Link to="/connexion" className="font-semibold text-brand underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthLayout>
  );
}
