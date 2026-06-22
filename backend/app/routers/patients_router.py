from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, models, schemas, auth

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.get("/", response_model=List[schemas.User])
def get_my_patients(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_role("doctor"))
):
    """
    Ritorna la lista dei pazienti assegnati al medico attualmente loggato.
    """
    patients = db.query(models.User).filter(
        models.User.role == "patient",
        models.User.doctor_id == current_user.id
    ).all()
    return patients

@router.get("/me", response_model=schemas.User)
def get_patient_profile(
    current_user: models.User = Depends(auth.require_role("patient"))
):
    """
    Ritorna le informazioni del paziente attualmente loggato.
    """
    return current_user

@router.get("/{patient_id}/sessions", response_model=List[schemas.SessionResponse])
def get_patient_sessions(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role == "patient" and current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    sessions = db.query(models.Session).filter(models.Session.patient_id == patient_id).all()
    return sessions

@router.get("/{patient_id}/alerts", response_model=List[schemas.AlertResponse])
def get_patient_alerts(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role == "patient" and current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    alerts = db.query(models.Alert).filter(models.Alert.patient_id == patient_id).all()
    return alerts

