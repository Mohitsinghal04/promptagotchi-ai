import pytest
from server import app

@pytest.fixture
def client():
    # Configure the app for testing
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_index_route(client):
    """Test that the main selection screen (index.html) loads successfully."""
    response = client.get('/')
    assert response.status_code == 200
    # Verify key HTML elements are rendered
    assert b'PROMPTAGOTCHI' in response.data
    assert b'selection-screen' in response.data

def test_static_css_route(client):
    """Test that static CSS assets are correctly served."""
    response = client.get('/style.css')
    assert response.status_code == 200
    assert b'--bg-gradient' in response.data

def test_static_js_route(client):
    """Test that static JavaScript assets are correctly served."""
    response = client.get('/app.js')
    assert response.status_code == 200
    assert b'petState' in response.data

def test_api_chat_method_not_allowed(client):
    """Test that the /api/chat proxy endpoint rejects insecure GET requests."""
    response = client.get('/api/chat')
    assert response.status_code == 404  # Not Found (Masked by serve_static)

def test_api_chat_empty_payload(client):
    """Test that the AI proxy securely handles an empty POST payload safely without crashing."""
    response = client.post('/api/chat', json={})
    
    # It should either return 500 (Missing API key in test env) or pass to Gemini and return an error
    assert response.status_code in [400, 429, 500]
    
    data = response.get_json()
    assert "error" in data

def test_api_route_scaffolding(client):
    """Ensure that invalid API routes return a hard 404 instead of the 200 SPA catch-all."""
    response = client.get('/api/unknown_endpoint')
    assert response.status_code == 404
    assert b'Not Found' in response.data
