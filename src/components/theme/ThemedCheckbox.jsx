import { Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';

/* Custom checkbox — a native one paints itself in the browser's own
   accent colour, which is why the consent row read blue in an
   otherwise orange app. onChange emits the next boolean directly,
   matching ThemedSelect/ThemedDate's onChange(value) convention.

   The whole control is one button (box + label inside) rather than a
   <label> wrapping a hidden input, so clicking the text toggles it
   too without relying on label/for wiring. */
export default function ThemedCheckbox({ checked, onChange, label, disabled = false, className = '' }) {
  const { getThemeColor } = useTheme();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={!!checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed group ${className}`}
    >
      <span
        className={`w-[18px] h-[18px] flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
          checked ? '' : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400 dark:group-hover:border-gray-500'
        }`}
        style={checked ? { backgroundColor: getThemeColor(), borderColor: getThemeColor() } : undefined}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3.5} />}
      </span>
      {label && <span className="select-none">{label}</span>}
    </button>
  );
}
