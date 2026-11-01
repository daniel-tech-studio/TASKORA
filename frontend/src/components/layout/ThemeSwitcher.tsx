import { Monitor, Moon, Sun } from 'lucide-react';
import { Menu } from '../ui/Menu';
import { useTheme, type ThemePreference } from '../../lib/theme';

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Clair', Icon: Sun },
  { value: 'dark', label: 'Sombre', Icon: Moon },
  { value: 'system', label: 'Système', Icon: Monitor },
];

/** Choix clair / sombre / système, mémorisé localement (llm.md 3.7). */
export function ThemeSwitcher() {
  const { preference, resolved, setPreference } = useTheme();
  const CurrentIcon = resolved === 'dark' ? Moon : Sun;
  const current = OPTIONS.find((o) => o.value === preference)!;
  return (
    <Menu
      radio
      triggerLabel={`Thème : ${current.label}`}
      trigger={<CurrentIcon className="size-5" aria-hidden />}
      items={OPTIONS.map(({ value, label, Icon }) => ({
        key: value,
        label,
        icon: <Icon className="size-[18px]" aria-hidden />,
        checked: preference === value,
        onSelect: () => setPreference(value),
      }))}
    />
  );
}
