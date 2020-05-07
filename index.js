const fs = require('fs');
const path = require('path');
const visit = require('unist-util-visit');

function codeImport(options = {}) {
  return function transformer(tree, file) {
    const codes = [];
    const promises = [];

    visit(tree, 'code', (node, index, parent) => {
      codes.push([node, index, parent]);
    });

    for (const [node] of codes) {
      // Get the name of file //
      const fileMeta = (node.meta || '')
        .split(' ')
        .find(meta => meta.startsWith('file='));

      if (!fileMeta) {
        continue;
      }

      const filePath = fileMeta.slice('file='.length);
      const fileAbsPath = path.resolve(file.dirname, filePath);

      // Get the beginning and end line //
      const startMeta = (node.meta || '')
        .split(' ')
        .find(meta => meta.startsWith('start='));

      const endMeta = (node.meta || '')
        .split(' ')
        .find(meta => meta.startsWith('end='));

      if (startMeta && endMeta) {
        startLine = startMeta.slice('start='.length);
        endLine = endMeta.slice('end='.length);
      }

      // Get the tag //
      const tagMeta = (node.meta || '')
        .split(' ')
        .find(meta => meta.startsWith('tag='));

      if (tagMeta) {
        tag = tagMeta.slice('tag='.length);
        regex = new RegExp(
          '(?<=// <code_example tag="' +
            tag +
            '">\n)(.*?)(?=\\s*// </code_example>)',
          'gs'
        );
      }

      if (options.async) {
        promises.push(
          new Promise((resolve, reject) => {
            fs.readFile(fileAbsPath, 'utf8', (err, fileContent) => {
              if (err) {
                reject(err);
                return;
              }
              if (startMeta && endMeta) {
                node.value = fileContent
                  .split('\n')
                  .slice(startLine - 1, endLine)
                  .join('\n');
              } else if (tagMeta) {
                node.value = fileContent.match(regex).toString();
              } else {
                node.value = fileContent.trim();
              }
              resolve();
            });
          })
        );
      } else {
        const fileContent = fs.readFileSync(fileAbsPath, 'utf8');
        if (startMeta && endMeta) {
          node.value = fileContent
            .split('\n')
            .slice(startLine - 1, endLine)
            .join('\n');
        } else if (tagMeta) {
          node.value = fileContent.match(regex).toString();
        } else {
          node.value = fileContent.trim();
        }
      }
    }

    if (promises.length) {
      return Promise.all(promises);
    }
  };
}

module.exports = codeImport;
