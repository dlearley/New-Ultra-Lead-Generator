#!/usr/bin/env python3
import json
import yaml
from pathlib import Path

from app.main import app


def generate_openapi_spec():
    openapi_schema = app.openapi()
    
    output_dir = Path("docs")
    output_dir.mkdir(exist_ok=True)
    
    json_path = output_dir / "openapi.json"
    with open(json_path, "w") as f:
        json.dump(openapi_schema, f, indent=2)
    print(f"✓ Generated OpenAPI JSON: {json_path}")
    
    yaml_path = output_dir / "openapi.yaml"
    with open(yaml_path, "w") as f:
        yaml.dump(openapi_schema, f, default_flow_style=False, sort_keys=False)
    print(f"✓ Generated OpenAPI YAML: {yaml_path}")
    
    print("\n✓ OpenAPI specification generated successfully!")
    print(f"  - JSON: {json_path}")
    print(f"  - YAML: {yaml_path}")


if __name__ == "__main__":
    generate_openapi_spec()
