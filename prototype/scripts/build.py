"""Build the prototype: join src/shell.html, src/style.css and the numbered src/*.js files into app/index.html.

The JavaScript files share one scope (they are concatenated in name order inside a single function), so order matters.
Run from anywhere:  python3 prototype/scripts/build.py
"""
import glob, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(root, 'src') + os.sep
shell = open(src + 'shell.html', encoding='utf-8').read()
css = open(src + 'style.css', encoding='utf-8').read()
js = '\n'.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(src + '0*.js')))
js = '(() => {\n' + js + '\n})();'
assert '</script' not in js
out = shell.replace('/*__CSS__*/', css).replace('/*__JS__*/', js)
open(os.path.join(root, 'app', 'index.html'), 'w', encoding='utf-8').write(out)
print('built app/index.html,', len(out), 'characters')
