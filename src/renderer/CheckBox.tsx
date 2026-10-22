import { useEffect, useRef } from 'react';

export function CheckBox(props: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean, shiftKey: boolean) => void;
  label?: string;
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const mixed = Boolean(props.indeterminate && !props.checked);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = mixed;
  }, [mixed]);

  const control = (
    <span className={`check${props.checked ? ' on' : ''}${mixed ? ' mixed' : ''}`}>
      <input
        ref={ref}
        id={props.id}
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        aria-label={props.label ? undefined : props.ariaLabel}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const shiftKey = 'shiftKey' in event.nativeEvent ? Boolean((event.nativeEvent as MouseEvent).shiftKey) : false;
          props.onChange(event.target.checked, shiftKey);
        }}
      />
      <svg viewBox="0 0 16 16" aria-hidden="true">
        {mixed ? <path d="M4 8h8" /> : <path d="M3.5 8.25 6.4 11.1 12.5 4.8" />}
      </svg>
    </span>
  );

  if (!props.label) return control;
  return (
    <label className="check-row" htmlFor={props.id}>
      {control}
      <span>{props.label}</span>
    </label>
  );
}
