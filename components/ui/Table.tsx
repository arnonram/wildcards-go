import type { ReactNode, TableHTMLAttributes } from 'react';
import { cn } from '../../helpers/cn';

export function SheetTable({
  children,
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement> & { children: ReactNode }) {
  return (
    // Left padding gives flush fields in the first column room to bleed without clipping.
    <div className="-mr-1 -ml-3 overflow-x-auto pl-3">
      <table className={cn('w-full border-collapse text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <tr className={cn('group transition-colors hover:bg-surface-2/60', className)}>{children}</tr>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap border-b border-line px-2 py-1.5 first:pl-0 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn('border-b border-line/70 px-2 py-1 align-middle first:pl-0', className)}>
      {children}
    </td>
  );
}
