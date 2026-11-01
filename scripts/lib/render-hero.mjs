// Picks the hero style from config.heroStyle: terminal (default), system or signal.
import { renderHero as terminal } from './hero/terminal.mjs';
import { renderHero as system } from './hero/system.mjs';
import { renderHero as signal } from './hero/signal.mjs';
import { renderHero as neofetch } from './hero/neofetch.mjs';

const styles = { terminal, 'terminal-system': terminal, system, signal, neofetch };

export function renderHero(input) {
  const style = styles[input.config.heroStyle] ?? terminal;
  return style(input);
}
