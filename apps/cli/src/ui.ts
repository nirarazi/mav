import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import boxen from 'boxen';
import figures from 'figures';

const purple = chalk.hex('#7C5CFC');
const dim = chalk.gray;
const green = chalk.green;
const red = chalk.red;
const yellow = chalk.yellow;

export function banner() {
  const art = purple.bold(`
  ███╗   ███╗ █████╗ ██╗   ██╗
  ████╗ ████║██╔══██╗██║   ██║
  ██╔████╔██║███████║██║   ██║
  ██║╚██╔╝██║██╔══██║╚██╗ ██╔╝
  ██║ ╚═╝ ██║██║  ██║ ╚████╔╝
  ╚═╝     ╚═╝╚═╝  ╚═╝  ╚═══╝`);

  const tagline = dim('  Autonomous social media for zero-human companies\n');
  console.log(art);
  console.log(tagline);
}

export function spinner(text: string) {
  return ora({ text, color: 'magenta', spinner: 'dots' });
}

export function table(headers: string[], rows: (string | number)[][]) {
  const t = new Table({
    head: headers.map(h => purple.bold(h)),
    style: { head: [], border: ['gray'] },
    chars: {
      'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
      'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
      'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
      'right': '│', 'right-mid': '┤', 'middle': '│'
    }
  });
  rows.forEach(r => t.push(r.map(String)));
  console.log(t.toString());
}

export function statusBox(title: string, items: Record<string, string>) {
  const lines = Object.entries(items).map(([k, v]) => `${dim(k + ':')} ${v}`);
  const content = lines.join('\n');
  console.log(boxen(content, {
    title: purple.bold(` ${title} `),
    padding: 1,
    margin: { top: 0, bottom: 1, left: 1, right: 1 },
    borderStyle: 'round',
    borderColor: '#7C5CFC',
  }));
}

export function success(msg: string) {
  console.log(`${green(figures.tick)} ${msg}`);
}

export function error(msg: string) {
  console.log(`${red(figures.cross)} ${msg}`);
}

export function warn(msg: string) {
  console.log(`${yellow(figures.warning)} ${msg}`);
}

export function info(msg: string) {
  console.log(`${purple(figures.info)} ${msg}`);
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len - 1) + '\u2026';
}

export { purple, dim, green, red, yellow, chalk };
