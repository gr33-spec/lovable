import { Fragment, type ReactNode } from "react";

// Mise en forme très simple des textes saisis dans l'administration
// (descriptions, pages légales) : titres « ## », listes « - », **gras**,
// [liens](https://…), paragraphes. Le texte n'est JAMAIS interprété comme du
// HTML : React l'échappe, donc aucune injection de script n'est possible.

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(\[À (?:COMPLÉTER|VÉRIFIER|VALIDER)[^\]]*\])|\*\*([^*]+)\*\*|\[([^\]]{1,200})\]\((https:\/\/[^\s)]{1,500}|mailto:[^\s)]{1,254}|\/[^\s)]{0,300})\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      // Passage à compléter : bien visible tant qu'il n'a pas été remplacé.
      out.push(
        <mark key={`${keyPrefix}-m${i++}`} className="rounded bg-warning-bg px-1 font-semibold text-warning">
          {m[1]}
        </mark>,
      );
    } else if (m[2]) out.push(<strong key={`${keyPrefix}-b${i++}`}>{m[2]}</strong>);
    else {
      const external = m[4].startsWith("https://");
      out.push(
        <a key={`${keyPrefix}-a${i++}`} href={m[4]} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {m[3]}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderRichText(source: string): ReactNode {
  const blocks = source.replace(/\r\n?/g, "\n").split(/\n{2,}/);
  return blocks.map((block, bi) => {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (!lines.length) return null;
    const nodes: ReactNode[] = [];
    let list: string[] = [];
    let para: string[] = [];
    const flushList = () => {
      if (list.length) {
        nodes.push(
          <ul key={`${bi}-ul${nodes.length}`}>
            {list.map((item, li) => (
              <li key={li}>{inline(item, `${bi}-${li}`)}</li>
            ))}
          </ul>,
        );
        list = [];
      }
    };
    const flushPara = () => {
      if (para.length) {
        nodes.push(
          <p key={`${bi}-p${nodes.length}`}>
            {para.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(l, `${bi}-p${li}`)}
              </Fragment>
            ))}
          </p>,
        );
        para = [];
      }
    };
    for (const line of lines) {
      const heading = /^#{2,3}\s+(.+)$/.exec(line);
      const item = /^\s*[-•]\s+(.+)$/.exec(line);
      if (heading) {
        flushList();
        flushPara();
        nodes.push(<h2 key={`${bi}-h${nodes.length}`}>{inline(heading[1], `${bi}-h`)}</h2>);
      } else if (item) {
        flushPara();
        list.push(item[1]);
      } else {
        flushList();
        para.push(line);
      }
    }
    flushList();
    flushPara();
    return <Fragment key={bi}>{nodes}</Fragment>;
  });
}

/** Repère les passages encore à compléter dans un texte (« [À COMPLÉTER … ] »). */
export function hasPlaceholders(text: string): boolean {
  return /\[À (COMPLÉTER|VÉRIFIER|VALIDER)/i.test(text);
}
