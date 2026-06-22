from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    codice_fiscale: Optional[str] = None
    date_of_birth: Optional[str] = None
    place_of_birth: Optional[str] = None
    email: str
    role: str = "patient"

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    codice_fiscale: Optional[str] = None
    date_of_birth: Optional[str] = None
    place_of_birth: Optional[str] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    doctor_id: Optional[int] = None

class User(UserBase):
    id: int
    is_active: bool
    doctor_id: Optional[int] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

from datetime import datetime

class SessionBase(BaseModel):
    pass

class SessionCreate(SessionBase):
    patient_id: int

class SessionResponse(SessionBase):
    id: int
    patient_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    is_active: bool

    class Config:
        from_attributes = True

class AlertBase(BaseModel):
    alert_type: str
    description: str

class AlertCreate(AlertBase):
    session_id: Optional[int] = None
    patient_id: int

class AlertResponse(AlertBase):
    id: int
    session_id: Optional[int]
    patient_id: int
    timestamp: datetime
    is_resolved: bool

    class Config:
        from_attributes = True

class PushTokenCreate(BaseModel):
    token: str
    device_type: Optional[str] = None

class PushTokenResponse(PushTokenCreate):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class ExerciseLogBase(BaseModel):
    exercise_type: str
    score: int
    max_contraction: int
    duration: int

class ExerciseLogCreate(ExerciseLogBase):
    pass

class ExerciseLogResponse(ExerciseLogBase):
    id: int
    patient_id: int
    timestamp: datetime

    class Config:
        from_attributes = True
