import os
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

INFLUXDB_URL = os.getenv("INFLUXDB_URL", "http://localhost:8086")
INFLUXDB_TOKEN = os.getenv("INFLUXDB_TOKEN", "my-super-secret-auth-token")
INFLUXDB_ORG = os.getenv("INFLUXDB_ORG", "synap_org")
INFLUXDB_BUCKET = os.getenv("INFLUXDB_BUCKET", "synap_bucket")

client = InfluxDBClient(url=INFLUXDB_URL, token=INFLUXDB_TOKEN, org=INFLUXDB_ORG)
write_api = client.write_api(write_options=SYNCHRONOUS)
query_api = client.query_api()

def write_sensor_data(patient_id: str, sensor_type: str, value: float):
    point = Point("sensor_data") \
        .tag("patient_id", patient_id) \
        .tag("sensor_type", sensor_type) \
        .field("value", value)
    
    write_api.write(bucket=INFLUXDB_BUCKET, org=INFLUXDB_ORG, record=point)

def query_sensor_data(patient_id: str, sensor_type: str, time_range: str = "-1h"):
    query = f'''
        from(bucket: "{INFLUXDB_BUCKET}")
        |> range(start: {time_range})
        |> filter(fn: (r) => r["_measurement"] == "sensor_data")
        |> filter(fn: (r) => r["patient_id"] == "{patient_id}")
        |> filter(fn: (r) => r["sensor_type"] == "{sensor_type}")
    '''
    result = query_api.query(org=INFLUXDB_ORG, query=query)
    data = []
    for table in result:
        for record in table.records:
            data.append({
                "time": record.get_time(),
                "value": record.get_value()
            })
    return data
