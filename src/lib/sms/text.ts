/*
 * Text of a staff message sent by SMS. Kept to three SMS parts (459 GSM
 * characters) and always ending with how to stop SMS (CLAUDE.md, Messages).
 */

export const SMS_MAX = 459;

export function smsText(title: string, body: string, stopLine: string) {
  const room = SMS_MAX - stopLine.length - 1;
  let main = `SabbathLink: ${title.trim()}\n${body.trim()}`;
  if (main.length > room) main = `${main.slice(0, Math.max(room - 1, 0)).trimEnd()}…`;
  return `${main}\n${stopLine}`;
}
