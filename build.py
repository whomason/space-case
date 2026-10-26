import os
HERE = os.path.dirname(os.path.abspath(__file__))
order = ['core','audio','data','content','gear2','sprites','backdrop','items','state','gfx','combat','foes','bosses','ui','planet','range','crates','hub','online','main']
src = '\n'.join(open(os.path.join(HERE, 'src', n + '.js')).read() for n in order)
head = open(os.path.join(HERE, 'head.html')).read()
html = head + '<script>\n' + src + '\n</script>\n'
open(os.path.join(HERE, 'space-case.html'), 'w').write(html)
open(os.path.join(HERE, 'index.html'), 'w').write(html)
print(len(src), 'bytes js')
