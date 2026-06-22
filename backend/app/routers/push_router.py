from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import database, models, schemas, auth

router = APIRouter(prefix="/push", tags=["Push Notifications"])

@router.post("/token", response_model=schemas.PushTokenResponse)
def register_token(
    token_data: schemas.PushTokenCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Check if token already exists
    existing = db.query(models.PushToken).filter(
        models.PushToken.token == token_data.token,
        models.PushToken.user_id == current_user.id
    ).first()
    
    if existing:
        return existing
        
    new_token = models.PushToken(
        user_id=current_user.id,
        token=token_data.token,
        device_type=token_data.device_type
    )
    db.add(new_token)
    try:
        db.commit()
        db.refresh(new_token)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Could not register token")
        
    return new_token
