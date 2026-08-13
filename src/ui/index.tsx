import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "quiet" | "danger";

export function Button({ variant = "primary", children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={`ui-button ui-button--${variant} ${className}`.trim()} {...props}>{children}</button>;
}

export type PanelState = "idle" | "active" | "warning" | "danger" | "success";

export function Panel({ state = "idle", children, className = "", ...props }: HTMLAttributes<HTMLElement> & { state?: PanelState }) {
  return <section className={`ui-panel ui-panel--${state} ${className}`.trim()} data-state={state} {...props}>{children}</section>;
}

export function Signal({ label, state = "idle", children }: { label: string; state?: PanelState; children?: ReactNode }) {
  return <span className="ui-signal" data-state={state}><span className="ui-signal__dot" aria-hidden="true" /> <span>{label}</span>{children && <span className="ui-signal__value">{children}</span>}</span>;
}

export function Icon({ name, label }: { name: "arrow" | "lock" | "spark"; label: string }) {
  const paths = { arrow: "M3 12h16m-6-6 6 6-6 6", lock: "M7 10V7a5 5 0 0 1 10 0v3m-11 0h12v10H6V10Z", spark: "m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" };
  return <svg className="ui-icon" viewBox="0 0 24 24" role="img" aria-label={label} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter"><path d={paths[name]} /></svg>;
}

export function Topology({ rooms, activeRoom, label = "Dungeon topology" }: { rooms: readonly string[]; activeRoom?: string; label?: string }) {
  return <ol className="ui-topology" aria-label={label}>{rooms.map((room, index) => <li className={`ui-topology__node ${room === activeRoom ? "is-active" : ""}`.trim()} data-active={room === activeRoom} key={`${room}-${index}`}><span className="ui-topology__index">{String(index + 1).padStart(2, "0")}</span><span>{room}</span></li>)}</ol>;
}
