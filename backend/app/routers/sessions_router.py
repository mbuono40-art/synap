from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from .. import database, models, schemas, auth

router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.post("", response_model=schemas.SessionResponse)
def start_session(
    session_data: schemas.SessionCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Only allow the patient themselves or their doctor to start a session
    if current_user.role == "patient" and current_user.id != session_data.patient_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_session = models.Session(
        patient_id=session_data.patient_id,
        is_active=True
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@router.put("/{session_id}/stop", response_model=schemas.SessionResponse)
def stop_session(
    session_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if current_user.role == "patient" and current_user.id != session.patient_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    session.is_active = False
    session.end_time = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session

@router.get("", response_model=List[schemas.SessionResponse])
def get_sessions(
    patient_id: int = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    query = db.query(models.Session)
    
    if current_user.role == "patient":
        query = query.filter(models.Session.patient_id == current_user.id)
    elif patient_id:
        query = query.filter(models.Session.patient_id == patient_id)
        
    return query.all()
