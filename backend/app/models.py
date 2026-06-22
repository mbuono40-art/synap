from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    codice_fiscale = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True)
    place_of_birth = Column(String, nullable=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="patient") # "patient" or "doctor"
    is_active = Column(Boolean, default=True)
    
    # Per i pazienti: a quale medico sono assegnati
    doctor_id = Column(Integer, nullable=True)

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    alert_type = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    description = Column(String)
    is_resolved = Column(Boolean, default=False)

class PushToken(Base):
    __tablename__ = "push_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    token = Column(String, unique=True, index=True)
    device_type = Column(String, nullable=True)

class ExerciseLog(Base):
    __tablename__ = "exercise_logs"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    exercise_type = Column(String) # 'FSR' or 'EMG'
    score = Column(Integer) # Percentage score 0-100
    max_contraction = Column(Integer) # The MVC recorded
    duration = Column(Integer) # Duration of the active exercise in seconds
    timestamp = Column(DateTime, default=datetime.utcnow)
