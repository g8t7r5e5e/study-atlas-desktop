"use strict";
const acorn = require("acorn");
// Compile only trusted source at build time. Imported values are captured in closures.
function compile(source) {
  const ast = acorn.parse(source, { ecmaVersion: "latest" });
  function children(n) {
    return Object.values(n)
      .flatMap((v) =>
        Array.isArray(v) ? v : v && typeof v === "object" ? [v] : [],
      )
      .filter((v) => v?.type);
  }
  function rebuild(n) {
    let s = source.slice(n.start, n.end);
    for (const c of children(n).sort((a, b) => b.start - a.start))
      s = s.slice(0, c.start - n.start) + visit(c) + s.slice(c.end - n.start);
    return s;
  }
  function parts(n) {
    if (n.type === "Literal") return { text: n.value, expr: [] };
    return {
      text: n.quasis
        .map(
          (q, i) =>
            q.value.cooked +
            (i < n.expressions.length ? `__ATLAS_EXPR_${i}__` : ""),
        )
        .join(""),
      expr: n.expressions.map(visit),
    };
  }
  function substitute(s, expr) {
    return s.replace(/__ATLAS_EXPR_(\d+)__/g, (_, i) => `\${${expr[+i]}}`);
  }
  function literalTemplate(s, expr) {
    return (
      "`" +
      substitute(
        s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${"),
        expr,
      ) +
      "`"
    );
  }
  function handler(text, expr) {
    if (/^__ATLAS_EXPR_\d+__$/.test(text)) return expr[+text.match(/\d+/)[0]];
    // Parse the static action with placeholder identifiers. Replace placeholders inside
    // quoted strings as values; never concatenate imported values into executable code.
    const tree = acorn.parse(text, {
      ecmaVersion: "latest",
      allowReturnOutsideFunction: true,
    });
    const edits = [];
    function collect(n) {
      if (
        n.type === "Literal" &&
        typeof n.value === "string" &&
        /__ATLAS_EXPR_\d+__/.test(n.value)
      ) {
        const segments = n.value.split(/(__ATLAS_EXPR_\d+__)/);
        edits.push([
          n.start,
          n.end,
          "(" +
            segments
              .filter(Boolean)
              .map((s) =>
                /^__ATLAS_EXPR_/.test(s)
                  ? `String(${expr[+s.match(/\d+/)[0]]})`
                  : JSON.stringify(s),
              )
              .join("+") +
            ")",
        ]);
        return;
      }
      if (n.type === "Identifier" && /^__ATLAS_EXPR_\d+__$/.test(n.name)) {
        edits.push([n.start, n.end, "(" + expr[+n.name.match(/\d+/)[0]] + ")"]);
        return;
      }
      children(n).forEach(collect);
    }
    collect(tree);
    for (const [a, b, s] of edits.sort((a, b) => b[0] - a[0]))
      text = text.slice(0, a) + s + text.slice(b);
    return `function(event){${text}}`;
  }
  function html(n) {
    const p = parts(n);
    if (
      typeof p.text !== "string" ||
      !/\bon(?:click|change|input|submit)="/.test(p.text)
    )
      return rebuild(n);
    let seq = p.expr.length;
    const expressions = [...p.expr];
    const t = p.text.replace(
      /\bon(click|change|input|submit)="([^"]*)"/g,
      (_, kind, body) => {
        expressions.push(`registerAction(${handler(body, p.expr)})`);
        return `data-on${kind}="__ATLAS_EXPR_${seq++}__"`;
      },
    );
    return literalTemplate(t, expressions);
  }
  function visit(n) {
    if (
      n.type === "CallExpression" &&
      n.callee.type === "Identifier" &&
      n.callee.name === "btn"
    ) {
      const p = parts(n.arguments[1]);
      return (
        "btn(" +
        n.arguments
          .map((a, i) => (i === 1 ? handler(p.text, p.expr) : visit(a)))
          .join(",") +
        ")"
      );
    }
    if (
      n.type === "TemplateLiteral" ||
      (n.type === "Literal" && typeof n.value === "string")
    )
      return html(n);
    return rebuild(n);
  }
  return visit(ast);
}
module.exports = { compile };
