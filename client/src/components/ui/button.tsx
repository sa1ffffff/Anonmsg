import type { ButtonHTMLAttributes } from 'react';

export default function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`px-4 py-2 rounded-md border border-border-subtle text-sm hover:border-border-strong transition ${className}`}
      {...props}
    />
  );
}
