import httpx

def send_push_notification(token: str, title: str, body: str):
    if not token.startswith("ExponentPushToken"):
        print(f"Skipping push notification: Invalid token {token}")
        return

    url = "https://exp.host/--/api/v2/push/send"
    payload = {
        "to": token,
        "sound": "default",
        "title": title,
        "body": body,
    }
    
    try:
        # Usiamo httpx per inviare la notifica in modo sincrono/asincrono
        # Per semplicità qui usiamo la versione sincrona se non è async def
        with httpx.Client() as client:
            response = client.post(url, json=payload)
            print(f"Push notification sent to {token}: {response.status_code} {response.text}")
    except Exception as e:
        print(f"Error sending push notification: {e}")
