import os
HERE = os.path.dirname(os.path.abspath(__file__))
order = ['core','audio','data','content','gear2','sprites','backdrop','items','state','gfx','combat','foes','bosses','ui','planet','range','crates','hub','online','rt','arena','live','title','main']
src = '\n'.join(open(os.path.join(HERE, 'src', n + '.js')).read() for n in order)
head = open(os.path.join(HERE, 'head.html')).read()
# space-case.html: everything global, for the tests and the preview.
# index.html (the website): the same code inside one closure, so nothing can be poked from the browser console.
open(os.path.join(HERE, 'space-case.html'), 'w').write(head + '<script>\n' + src + '\n</script>\n')
open(os.path.join(HERE, 'index.html'), 'w').write(head + '<script>\n(() => {\n' + src + '\n})();\n</script>\n')
print(len(src), 'bytes js')
