const fs = require('fs');

function fixRequire(filepath) {
  let code = fs.readFileSync(filepath, 'utf8');
  if (code.includes("const { Readable } = require('stream');")) {
      code = code.replace("const { Readable } = require('stream');", "const { Readable } = await import('stream');");
      fs.writeFileSync(filepath, code);
      console.log('Fixed require in ' + filepath);
  }
}

fixRequire('server.ts');
fixRequire('api/index.ts');
