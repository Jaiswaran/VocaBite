const fs = require('fs');

function patchFile(filepath) {
  let code = fs.readFileSync(filepath, 'utf8');

  // Regex to match the buffer loading part
  const oldCode = `    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.setHeader('Content-Type', 'audio/mp3');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);`;

  const newCode = `    res.setHeader('Content-Type', 'audio/mp3');
    const { Readable } = require('stream');
    if (response.body) {
       Readable.fromWeb(response.body).pipe(res);
    } else {
       const arrayBuffer = await response.arrayBuffer();
       const buffer = Buffer.from(arrayBuffer);
       res.setHeader('Content-Length', buffer.length);
       res.send(buffer);
    }`;

  if (code.includes('const arrayBuffer = await response.arrayBuffer();')) {
     code = code.replace(oldCode, newCode);
     fs.writeFileSync(filepath, code);
     console.log('Patched ' + filepath);
  } else {
     console.log('Pattern not found in ' + filepath);
  }
}

patchFile('server.ts');
patchFile('api/index.ts');
