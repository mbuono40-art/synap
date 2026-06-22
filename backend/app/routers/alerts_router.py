from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, models, schemas, auth

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[schemas.AlertResponse])
def get_alerts(
    patient_id: int = None,
    session_id: int = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    query = db.query(models.Alert)
    
    if current_user.role == "patient":
        query = query.filter(models.Alert.patient_id == current_user.id)
    elif patient_id:
        query = query.filter(models.Alert.patient_id == patient_id)
        
    if session_id:
        query = query.filter(models.Alert.session_id == session_id)
        
    return query.all()
