// Find JSX component references that are neither imported nor defined locally.
//
// Base ESLint's no-undef does NOT treat <Foo/> as a reference to `Foo` (that
// needs eslint-plugin-react's jsx-uses-vars), so a missing import used ONLY as
// a JSX tag compiles, passes no-undef, and throws at render. That is exactly
// how ui.js shipped using <IcChk/> without importing it.
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..", "src", "modules");
// Discovered, never listed. A hardcoded list has the same blind spot as the bug
// this script exists to catch: DeleteCompany.js was added and silently skipped.
const FILES = ["SaaSModule.js"].concat(
  fs.readdirSync(path.join(DIR, "saas"))
    .filter(f => f.endsWith(".js"))
    .map(f => "saas/" + f)
);

// Comments talk about JSX too ("does not treat <Foo/> as a reference"), so
// drop whole comment lines before scanning or the checker cries wolf about its
// own prose. Deliberately line-wise: a regex that tries to strip /* */ blocks
// mangles JSX (which is full of /* and */ inside {} expressions) and silently
// eats the import block — which is exactly what a first attempt here did.
const stripComments = (s) =>
  s.split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");

let problems = 0;
for (const rel of FILES) {
  const raw = fs.readFileSync(path.join(DIR, rel), "utf8");
  const src = stripComments(raw);

  // Capitalised JSX tags: <Foo ...> and <Foo.Bar ...>
  const used = new Set(
    [...src.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)].map(m => m[1])
  );

  // Anything imported (named or default) or declared in this file
  const imported = new Set(
    [...src.matchAll(/import\s+([A-Za-z0-9_]+)\s*,?\s*(?:\{([^}]*)\})?\s*from/g)]
      .flatMap(m => [m[1], ...(m[2] || "").split(",")])
      .concat([...src.matchAll(/import\s*\{([^}]*)\}\s*from/g)].flatMap(m => m[1].split(",")))
      .map(s => (s || "").trim()).filter(Boolean)
  );
  const declared = new Set(
    [...src.matchAll(/(?:^|\n)\s*(?:export\s+default\s+)?(?:function|const|let|class)\s+([A-Za-z0-9_]+)/g)].map(m => m[1])
  );
  // Capitalised names can also arrive as destructured props — StatCard({ Icon })
  // renders <Icon/> from a parameter, not an import.
  for (const m of src.matchAll(/\(\s*\{([^}]*)\}\s*\)\s*(?:=>|\{)/g)) {
    m[1].split(",").forEach(p => {
      const name = p.split(/[:=]/)[0].trim();
      if (/^[A-Z]/.test(name)) declared.add(name);
    });
  }

  const missing = [...used].filter(n => !imported.has(n) && !declared.has(n));
  if (missing.length) {
    problems += missing.length;
    console.log("  " + rel.padEnd(28) + "MISSING: " + missing.join(", "));
    missing.forEach(n => {
      const line = src.slice(0, src.indexOf("<" + n)).split("\n").length;
      console.log("      <" + n + "/> first used at line " + line);
    });
  } else {
    console.log("  " + rel.padEnd(28) + "ok");
  }
}
console.log(problems ? `\n${problems} JSX identifier(s) would ReferenceError at render` : "\nno JSX identifiers missing");
process.exit(problems ? 1 : 0);
