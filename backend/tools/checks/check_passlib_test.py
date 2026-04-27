from passlib.context import CryptContext

ctx = CryptContext(schemes=['bcrypt'], deprecated='auto')
print('schemes', ctx.schemes())
h = ctx.hash('test')
print('hash ok', h[:20])
print('verify', ctx.verify('test', h))
