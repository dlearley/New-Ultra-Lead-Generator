import pytest
from app.services.webhook_service import WebhookService


def test_generate_secret():
    service = WebhookService()
    secret1 = service.generate_secret()
    secret2 = service.generate_secret()
    
    assert len(secret1) > 0
    assert len(secret2) > 0
    assert secret1 != secret2


def test_generate_signature():
    service = WebhookService()
    payload = '{"event": "new_lead", "data": {"id": "123"}}'
    secret = "test-secret"
    
    signature = service.generate_signature(payload, secret)
    
    assert len(signature) == 64
    assert signature == service.generate_signature(payload, secret)


def test_verify_signature():
    service = WebhookService()
    payload = '{"event": "new_lead", "data": {"id": "123"}}'
    secret = "test-secret"
    
    signature = service.generate_signature(payload, secret)
    
    assert service.verify_signature(payload, signature, secret) is True
    assert service.verify_signature(payload, signature, "wrong-secret") is False
    assert service.verify_signature(payload, "wrong-signature", secret) is False
