import requests
r = requests.post('http://localhost:8000/api/v1/auth/login', json={'email':'admin@eduai.com','password':'admin123456'})
print(r.status_code)
print(r.text)
