from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, models, schemas, auth

router = APIRouter(
    prefix="/exercises",
    tags=["Exercises"]
)

@router.post("/", response_model=schemas.ExerciseLogResponse)
def create_exercise_log(
    exercise_log: schemas.ExerciseLogCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can log exercises")
        
    db_log = models.ExerciseLog(
        patient_id=current_user.id,
        exercise_type=exercise_log.exercise_type,
        score=exercise_log.score,
        max_contraction=exercise_log.max_contraction,
        duration=exercise_log.duration
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

@router.get("/me", response_model=List[schemas.ExerciseLogResponse])
def get_my_exercise_logs(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can view their exercise logs")
        
    logs = db.query(models.ExerciseLog).filter(models.ExerciseLog.patient_id == current_user.id).order_by(models.ExerciseLog.timestamp.desc()).all()
    return logs
