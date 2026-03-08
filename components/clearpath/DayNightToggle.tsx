'use client';

interface DayNightToggleProps {
    isDark: boolean;
    onToggle: () => void;
}

export default function DayNightToggle({ isDark, onToggle }: DayNightToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="cp-theme-toggle"
      aria-label={isDark ? 'Switch to day mode' : 'Switch to night mode'}
      title={isDark ? 'Night mode enabled' : 'Day mode enabled'}
    >
      <span className={`cp-theme-label ${isDark ? 'cp-theme-label--active' : ''}`}>Night</span>
      <span className={`cp-theme-label ${!isDark ? 'cp-theme-label--active' : ''}`}>Day</span>
      <span className={`cp-theme-knob ${!isDark ? 'cp-theme-knob--right' : ''}`} />
    </button>
  );
}
