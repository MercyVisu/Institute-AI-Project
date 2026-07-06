import bcrypt
import inspect

print('has __about__:', hasattr(bcrypt, '__about__'))
try:
    print('bcrypt.__about__:', bcrypt.__about__)
except Exception as e:
    print('error reading __about__:', e)

print('dir sample:', dir(bcrypt)[:60])
print('module file:', inspect.getsourcefile(bcrypt))
