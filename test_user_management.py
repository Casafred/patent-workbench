from backend.app import create_app

app = create_app()

with app.test_client() as client:
    response = client.get('/user-management')
    print(f"Status Code: {response.status_code}")
    print(f"Content-Type: {response.content_type}")
    if response.status_code == 200:
        print("Success!")
    else:
        print(f"Error: {response.data.decode()}")
