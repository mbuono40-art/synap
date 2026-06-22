import asyncio
import os
import json
import aiomqtt
from .influx import write_sensor_data
from .websocket_manager import manager

MQTT_BROKER = os.getenv("MQTT_HOST", "localhost")

async def mqtt_bridge_task():
    try:
        async with aiomqtt.Client(MQTT_BROKER) as client:
            await client.subscribe("synap/+/+")
            print(f"Subscribed to MQTT broker at {MQTT_BROKER}")
            async for message in client.messages:
                payload = message.payload.decode()
                topic = message.topic.value
                
                print(f"Received MQTT message: {topic} - {payload}")
                
                # Format expected: synap/patient_id/sensor_type
                parts = topic.split("/")
                if len(parts) >= 3:
                    patient_id = parts[1]
                    sensor_type = parts[2]
                    try:
                        value = float(payload)
                        try:
                            # Write to InfluxDB
                            write_sensor_data(patient_id, sensor_type, value)
                        except Exception as e:
                            print(f"InfluxDB write error: {e}")
                        
                        # Broadcast to WebSockets
                        ws_message = json.dumps({
                            "patient_id": patient_id,
                            "sensor_type": sensor_type,
                            "value": value
                        })
                        await manager.broadcast(ws_message)
                    except ValueError:
                        print(f"Invalid payload for {topic}: {payload}")
    except Exception as e:
        print(f"MQTT bridge error: {e}")
