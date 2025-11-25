# check_json.py
import json
import os

print("🔍 Checking JSON Export File...")

# Check if file exists
if not os.path.exists('database_export.json'):
    print("❌ database_export.json file not found!")
    exit()

# Check file size
file_size = os.path.getsize('database_export.json')
print(f"📁 File size: {file_size} bytes")

# Read and check JSON data
try:
    with open('database_export.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    print("✅ JSON file is valid")
    print(f"📊 Total tables: {len(data)}")

    # Show table summaries
    print("\n📋 Table Summary:")
    for table_name, records in data.items():
        print(f"   {table_name}: {len(records)} records")

        # Show first 2 records as sample
        if records:
            print(f"     Sample: {records[0]}")
            if len(records) > 1:
                print(f"            {records[1]}")

except Exception as e:
    print(f"❌ Error reading JSON: {e}")