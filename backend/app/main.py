import asyncio
import json
import time
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from . import database, models
from .routers import auth_router, patients_router, sessions_router, alerts_router, push_router, exercises_router

# Crea le tabelle nel database (se non esistono)
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="SYNAP Backend API")

from .notifications import send_push_notification
from .database import SessionLocal

async def daily_reminder_task():
    while True:
        # Questo ciclo gira in background.
        # Nella realtà aspetterebbe fino ad un'ora specifica.
        # Ora lo impostiamo a 24 ore (86400 secondi) per non intasare le notifiche
        await asyncio.sleep(86400)
        try:
            db = SessionLocal()
            tokens = db.query(models.PushToken).all()
            for t in tokens:
                send_push_notification(t.token, "Promemoria Synap", "È ora del tuo esercizio riabilitativo giornaliero!")
            db.close()
        except Exception as e:
            print(f"Errore nell'invio dei promemoria: {e}")

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(daily_reminder_task())


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(patients_router.router)
app.include_router(sessions_router.router)
app.include_router(alerts_router.router)
app.include_router(push_router.router)
app.include_router(exercises_router.router)

BASE_DIR = Path(__file__).resolve().parent

app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "static"),
    name="static"
)

@app.get("/")
def root():
    return {
        "message": "Backend FastAPI attivo per SYNAP",
        "websocket_test": "http://localhost:8000/static/websocket-test.html",
        "sse_test": "http://localhost:8000/static/sse-test.html",
    }

@app.get("/devices")
def get_devices():
    return [
        {"id": 1, "name": "Sensore EMG", "value": 0},
        {"id": 2, "name": "Sensore FSR", "value": 0},
    ]

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Backend attivo e pronto per SYNAP"}



@app.get("/sse/clock")
async def sse_clock():
    async def event_generator():
        counter = 0
        while True:
            counter += 1
            data = {
                "counter": counter,
                "server_time": time.strftime("%H:%M:%S"),
            }
            yield f"event: clock\n"
            yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
