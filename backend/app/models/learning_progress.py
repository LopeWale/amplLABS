from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime

from app.db.database import Base


class LearningProgress(Base):
    """Tracks user progress through learning modules."""

    __tablename__ = "learning_progress"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(String(50), nullable=False, index=True)  # lp_basics, mip_intro
    lesson_id = Column(String(50), nullable=False)
    status = Column(String(20), default="not_started")  # not_started, in_progress, completed
    score = Column(Integer, nullable=True)  # Quiz score if applicable
    time_spent = Column(Integer, default=0)  # Seconds spent on lesson
    notes = Column(Text, nullable=True)  # User notes
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<LearningProgress(module='{self.module_id}', lesson='{self.lesson_id}')>"
