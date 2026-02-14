from app.auth import create_access_token, hash_password, verify_password


def test_password_hashing() -> None:
  password = "supersecret"
  hashed = hash_password(password)
  assert verify_password(password, hashed)


def test_token_creation() -> None:
  token = create_access_token("123")
  assert token
