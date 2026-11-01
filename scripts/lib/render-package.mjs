// Picks the package card style from config.packageStyle:
// card (default), shell, json or plain.
import { renderPackage as card } from './package/card.mjs';
import { renderPackage as shell } from './package/shell.mjs';
import { renderPackage as json } from './package/json.mjs';
import { renderPackage as plain } from './package/plain.mjs';

const styles = { card, shell, json, plain };

export function renderPackage(input) {
  const style = styles[input.style] ?? card;
  return style(input);
}
