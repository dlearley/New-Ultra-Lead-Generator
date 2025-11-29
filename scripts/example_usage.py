#!/usr/bin/env python3
"""
Example usage of the Webhooks & API Key Management API
"""
import httpx
import json
from datetime import datetime


API_BASE = "http://localhost:8000/api/v1"


def main():
    print("=== Webhooks & API Key Management Example Usage ===\n")
    
    print("Note: This script assumes you have a valid API key.")
    print("In production, you would create an organization first, then an API key.\n")
    
    api_key = input("Enter your API key (or press Enter to skip): ").strip()
    if not api_key:
        print("No API key provided. Exiting.")
        return
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    with httpx.Client(timeout=30.0) as client:
        print("\n1. Creating a new API key...")
        try:
            response = client.post(
                f"{API_BASE}/keys",
                json={
                    "name": "Example API Key",
                    "role": "read_write",
                    "rate_limit": 1000
                },
                headers=headers
            )
            if response.status_code == 201:
                new_key = response.json()
                print(f"✓ Created API key: {new_key['key_prefix']}...")
                print(f"  Full key (save this!): {new_key['key']}")
            else:
                print(f"✗ Failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"✗ Error: {e}")
        
        print("\n2. Listing API keys...")
        try:
            response = client.get(f"{API_BASE}/keys", headers=headers)
            if response.status_code == 200:
                keys = response.json()
                print(f"✓ Found {len(keys)} API key(s)")
                for key in keys:
                    print(f"  - {key['name']} ({key['key_prefix']}...) - {key['role']}")
            else:
                print(f"✗ Failed: {response.status_code}")
        except Exception as e:
            print(f"✗ Error: {e}")
        
        print("\n3. Creating a webhook endpoint...")
        try:
            response = client.post(
                f"{API_BASE}/webhooks",
                json={
                    "url": "https://example.com/webhook",
                    "description": "Example webhook endpoint",
                    "events": ["new_lead", "lead_update"],
                    "max_retries": 5,
                    "timeout": 30
                },
                headers=headers
            )
            if response.status_code == 201:
                webhook = response.json()
                print(f"✓ Created webhook endpoint: {webhook['url']}")
                print(f"  Secret (save this!): {webhook['secret']}")
                webhook_id = webhook['id']
            else:
                print(f"✗ Failed: {response.status_code} - {response.text}")
                webhook_id = None
        except Exception as e:
            print(f"✗ Error: {e}")
            webhook_id = None
        
        print("\n4. Listing webhook endpoints...")
        try:
            response = client.get(f"{API_BASE}/webhooks", headers=headers)
            if response.status_code == 200:
                webhooks = response.json()
                print(f"✓ Found {len(webhooks)} webhook endpoint(s)")
                for webhook in webhooks:
                    status = "Active" if webhook['is_active'] else "Inactive"
                    print(f"  - {webhook['url']} - {status}")
            else:
                print(f"✗ Failed: {response.status_code}")
        except Exception as e:
            print(f"✗ Error: {e}")
        
        print("\n5. Triggering a new lead event...")
        try:
            response = client.post(
                f"{API_BASE}/events/leads",
                json={
                    "id": "lead_123",
                    "name": "John Doe",
                    "email": "john@example.com",
                    "phone": "+1234567890",
                    "source": "website"
                },
                headers=headers
            )
            if response.status_code == 202:
                result = response.json()
                print(f"✓ {result['message']}")
            else:
                print(f"✗ Failed: {response.status_code}")
        except Exception as e:
            print(f"✗ Error: {e}")
        
        print("\n6. Viewing delivery history...")
        try:
            response = client.get(f"{API_BASE}/webhooks/deliveries/", headers=headers)
            if response.status_code == 200:
                deliveries = response.json()
                print(f"✓ Found {len(deliveries)} delivery log(s)")
                for delivery in deliveries[:5]:
                    print(f"  - {delivery['event_type']} - {delivery['status']} - {delivery['attempt_count']} attempts")
            else:
                print(f"✗ Failed: {response.status_code}")
        except Exception as e:
            print(f"✗ Error: {e}")
        
        if webhook_id:
            print(f"\n7. Updating webhook endpoint...")
            try:
                response = client.put(
                    f"{API_BASE}/webhooks/{webhook_id}",
                    json={"is_active": False},
                    headers=headers
                )
                if response.status_code == 200:
                    print("✓ Webhook endpoint disabled")
                else:
                    print(f"✗ Failed: {response.status_code}")
            except Exception as e:
                print(f"✗ Error: {e}")
    
    print("\n=== Example completed ===")
    print("\nNext steps:")
    print("1. Visit http://localhost:8000/admin for the Admin UI")
    print("2. View API docs at http://localhost:8000/docs")
    print("3. Check out docs/openapi.yaml for the full API specification")


if __name__ == "__main__":
    main()
